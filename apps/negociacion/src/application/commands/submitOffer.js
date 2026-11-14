'use strict';

const { Offer } = require('../../domain/entities/offer');
const { PartRequestStatus } = require('../../domain/enums');
const { PartRequestNotFoundException, ForbiddenException, ActiveOfferConflictException } = require('../../domain/errors');
const { Topic, PartRequestEvent, OfferEvent } = require('../contracts');
const { buildEventEnvelope } = require('../buildEventEnvelope');

/**
 * Caso de uso: un proveedor aprobado envía una oferta.
 *
 * Bloquea la solicitud primero (SELECT ... FOR UPDATE), igual que retirar
 * y aceptar (AGENTS.md §4.1): así ninguna de las tres pisa a otra sobre la
 * misma solicitud mientras está en vuelo.
 *
 * La aprobación del proveedor se verifica DESPUÉS, dentro de la misma
 * transacción y con la fila de `suppliers` también bloqueada
 * (SELECT ... FOR SHARE, revisión fase 5, hallazgo 8): la fila de la
 * solicitud y la del proveedor son filas distintas, así que bloquear solo
 * la solicitud no alcanza — un SUPPLIER_REJECTED concurrente toca
 * `suppliers`, no `part_requests`. Con las dos filas bloqueadas, uno de
 * los dos (la oferta o el rechazo) espera al otro; nunca se cruzan.
 */
class SubmitOffer {
  constructor({ partRequestRepository, offerRepository, supplierRepository, outboxRepository, unitOfWork, producer }) {
    this.partRequestRepository = partRequestRepository;
    this.offerRepository = offerRepository;
    this.supplierRepository = supplierRepository;
    this.outboxRepository = outboxRepository;
    this.unitOfWork = unitOfWork;
    this.producer = producer;
  }

  /**
   * @param {Object} params
   * @param {number} params.partRequestId
   * @param {number} params.supplierId Del JWT (req.user.id)
   * @param {Object} params.data DTO validado: price, brand, condition, availability, deliveryType, estimatedDays, notes
   * @param {string} [params.correlationId]
   */
  async execute({ partRequestId, supplierId, data, correlationId }) {
    return this.unitOfWork.run(async (transaction) => {
      const partRequest = await this.partRequestRepository.lockById(partRequestId, { transaction });
      if (!partRequest) throw new PartRequestNotFoundException(partRequestId);

      const supplier = await this.supplierRepository.lockBySupplierId(supplierId, { transaction });
      if (!supplier?.approved) {
        throw new ForbiddenException('Solo un proveedor aprobado puede enviar ofertas');
      }

      partRequest.assertAcceptsOffers();

      const active = await this.offerRepository.findActiveBySupplierAndRequest(supplierId, partRequestId, {
        transaction,
      });
      if (active) throw new ActiveOfferConflictException(partRequestId);

      const offer = new Offer({
        partRequestId,
        supplierId,
        supplierName: supplier.businessName,
        price: data.price,
        brand: data.brand,
        condition: data.condition,
        availability: data.availability,
        deliveryType: data.deliveryType,
        estimatedDays: data.estimatedDays,
        notes: data.notes ?? null,
      });
      const saved = await this.offerRepository.save(offer, { transaction });

      // La primera oferta pasa la solicitud a RECEIVING_OFFERS (docs/flujo-principal.md).
      let previousStatus = null;
      if (partRequest.status === PartRequestStatus.PUBLISHED) {
        previousStatus = partRequest.changeStatus(PartRequestStatus.RECEIVING_OFFERS);
        await this.partRequestRepository.save(partRequest, { transaction });
      }

      const offerEnvelope = buildEventEnvelope({
        eventName: OfferEvent.SUBMITTED,
        producer: this.producer,
        correlationId,
        payload: {
          offer_id: saved.id,
          part_request_id: partRequestId,
          buyer_id: partRequest.userId,
          supplier_id: supplierId,
          supplier_name: saved.supplierName,
          price: saved.price,
          currency: saved.currency,
        },
      });
      await this.outboxRepository.enqueue(offerEnvelope, {
        exchange: Topic.OFFER,
        routingKey: OfferEvent.SUBMITTED,
        transaction,
      });

      if (previousStatus) {
        const statusEnvelope = buildEventEnvelope({
          eventName: PartRequestEvent.STATUS_CHANGED,
          producer: this.producer,
          correlationId,
          payload: {
            part_request_id: partRequestId,
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

      return saved;
    });
  }
}

module.exports = { SubmitOffer };
