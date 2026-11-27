'use strict';

const { PartRequestStatus, OfferStatus } = require('../../domain/enums');
const {
  OfferNotFoundException,
  PartRequestNotFoundException,
  ForbiddenException,
  OfferAlreadyAcceptedException,
  InvalidOfferTransitionException,
} = require('../../domain/errors');
const { Topic, PartRequestEvent, OfferEvent } = require('../contracts');
const { buildEventEnvelope } = require('../buildEventEnvelope');

const UNIQUE_VIOLATION = '23505'; // código de Postgres

/**
 * Caso de uso: el dueño de la solicitud acepta una oferta.
 *
 * La regla crítica, en las 3 capas de AGENTS.md §4.1:
 *   1. SELECT ... FOR UPDATE sobre la solicitud (vía offer.partRequestId).
 *   2. Verificación de dominio con el lock ya tomado (este archivo).
 *   3. Índice UNIQUE parcial en la base (uq_one_accepted_offer), por si
 *      algo se cuela: el unique_violation se traduce a 409, no a 500.
 *
 * Orden de las verificaciones (equipo, 2026-11-09): primero "¿ya hay una
 * aceptada?" → 409 (es la segunda aceptación). Los 422 de estado van
 * después. Con el orden invertido, la segunda aceptación daría 422 en vez
 * de 409.
 */
class AcceptOffer {
  constructor({ partRequestRepository, offerRepository, outboxRepository, unitOfWork, producer }) {
    this.partRequestRepository = partRequestRepository;
    this.offerRepository = offerRepository;
    this.outboxRepository = outboxRepository;
    this.unitOfWork = unitOfWork;
    this.producer = producer;
  }

  /**
   * @param {Object} params @param {number} params.offerId @param {number} params.actorId Del JWT
   * @param {string} [params.correlationId]
   * @returns {Promise<{offer: Offer, partRequest: PartRequest}>}
   */
  async execute({ offerId, actorId, correlationId }) {
    const target = await this.offerRepository.findById(offerId);
    if (!target) throw new OfferNotFoundException(offerId);

    try {
      return await this.unitOfWork.run(async (transaction) => {
        // 1. Bloquea la solicitud primero: ninguna otra accept/submit/withdraw
        //    sobre la MISMA solicitud puede avanzar hasta que esta transacción termine.
        const partRequest = await this.partRequestRepository.lockById(target.partRequestId, { transaction });
        if (!partRequest) throw new PartRequestNotFoundException(target.partRequestId);

        if (partRequest.userId !== actorId) {
          throw new ForbiddenException('Solo el dueño de la solicitud puede aceptar una oferta');
        }

        // 2a. ¿Ya hay otra oferta ACCEPTED? -> 409 (segunda aceptación).
        const alreadyAccepted = await this.offerRepository.findAcceptedByPartRequestId(partRequest.id, {
          transaction,
        });
        if (alreadyAccepted) throw new OfferAlreadyAcceptedException(partRequest.id);

        // 2b. Releemos la oferta objetivo CON el lock tomado: los 422 de estado van después del 409.
        const offer = await this.offerRepository.findById(offerId, { transaction });
        if (offer.status !== OfferStatus.SUBMITTED) {
          throw new InvalidOfferTransitionException(offer.id, offer.status, OfferStatus.ACCEPTED);
        }
        partRequest.assertCanTransition(PartRequestStatus.OFFER_ACCEPTED);

        // 3. Aplica: una ACCEPTED, las demás SUBMITTED -> REJECTED, la solicitud -> OFFER_ACCEPTED.
        offer.changeStatus(OfferStatus.ACCEPTED);
        const savedOffer = await this.offerRepository.save(offer, { transaction });

        const rejected = await this.offerRepository.rejectOthersSubmitted(partRequest.id, offer.id, { transaction });

        const previousStatus = partRequest.changeStatus(PartRequestStatus.OFFER_ACCEPTED);
        const savedRequest = await this.partRequestRepository.save(partRequest, { transaction });

        await this._enqueueEvents({
          transaction,
          correlationId,
          offer: savedOffer,
          partRequest: savedRequest,
          previousStatus,
          rejected,
        });

        return { offer: savedOffer, partRequest: savedRequest };
      });
    } catch (error) {
      if (error?.original?.code === UNIQUE_VIOLATION || error?.parent?.code === UNIQUE_VIOLATION) {
        // Red de seguridad del índice único: no debería llegar acá si el
        // lock de la solicitud funcionó, pero si se cuela, 409 y no 500.
        throw new OfferAlreadyAcceptedException(target.partRequestId);
      }
      throw error;
    }
  }

  async _enqueueEvents({ transaction, correlationId, offer, partRequest, previousStatus, rejected }) {
    const acceptedEnvelope = buildEventEnvelope({
      eventName: OfferEvent.ACCEPTED,
      producer: this.producer,
      correlationId,
      payload: {
        offer_id: offer.id,
        part_request_id: partRequest.id,
        buyer_id: partRequest.userId,
        supplier_id: offer.supplierId,
        supplier_name: offer.supplierName,
        price: offer.price,
        currency: offer.currency,
        delivery_type: offer.deliveryType,
        estimated_days: offer.estimatedDays,
        part_description: partRequest.description,
        vehicle_label: partRequest.vehicleLabel,
      },
    });
    await this.outboxRepository.enqueue(acceptedEnvelope, {
      exchange: Topic.OFFER,
      routingKey: OfferEvent.ACCEPTED,
      transaction,
    });

    for (const rejectedOffer of rejected) {
      const rejectedEnvelope = buildEventEnvelope({
        eventName: OfferEvent.REJECTED,
        producer: this.producer,
        correlationId,
        payload: {
          offer_id: rejectedOffer.id,
          part_request_id: partRequest.id,
          supplier_id: rejectedOffer.supplierId,
          reason: 'NOT_SELECTED',
        },
      });
      await this.outboxRepository.enqueue(rejectedEnvelope, {
        exchange: Topic.OFFER,
        routingKey: OfferEvent.REJECTED,
        transaction,
      });
    }

    const statusEnvelope = buildEventEnvelope({
      eventName: PartRequestEvent.STATUS_CHANGED,
      producer: this.producer,
      correlationId,
      payload: {
        part_request_id: partRequest.id,
        previous_status: previousStatus,
        new_status: partRequest.status,
      },
    });
    await this.outboxRepository.enqueue(statusEnvelope, {
      exchange: Topic.PART_REQUEST,
      routingKey: PartRequestEvent.STATUS_CHANGED,
      transaction,
    });
  }
}

module.exports = { AcceptOffer };
