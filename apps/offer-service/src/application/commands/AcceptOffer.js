'use strict';

const { OfferEvent, Topic, buildEvent } = require('@repuestos/shared');
const { AppError } = require('../../domain/errors/AppError');

function requestOwnerId(request) {
  return request.user_id ?? request.userId ?? request.buyer_id ?? request.owner_id;
}

class AcceptOffer {
  constructor({ offerRepository, requestClient, outboxRepository }) {
    this.offers = offerRepository;
    this.requests = requestClient;
    this.outbox = outboxRepository;
  }

  async execute({ offerId, actor, authorization, correlationId }) {
    const offerIdNumber = Number(offerId);
    if (!Number.isSafeInteger(offerIdNumber) || offerIdNumber <= 0) {
      throw new AppError('El identificador de oferta no es válido', 400, 'INVALID_INPUT');
    }
    const initialOffer = await this.offers.findById(offerIdNumber);
    if (!initialOffer) throw new AppError('Oferta no encontrada', 404, 'OFFER_NOT_FOUND');
    const request = await this.requests.findById(initialOffer.requestId, authorization);
    const ownerId = requestOwnerId(request);
    if (ownerId == null) {
      throw new AppError('Part Request Service no devolvió el propietario de la solicitud', 502, 'DEPENDENCY_ERROR');
    }
    if (String(ownerId) !== String(actor.id)) {
      throw new AppError('Solo el propietario de la solicitud puede aceptar una oferta', 403, 'FORBIDDEN');
    }
    if ((request.status ?? request.state ?? request.estado) !== 'PUBLISHED') {
      throw new AppError('La solicitud ya no admite la aceptación de ofertas', 422, 'PART_REQUEST_CLOSED');
    }

    try {
      return await this.offers.transaction(async (transaction) => {
        await this.offers.lockRequestAcceptance(initialOffer.requestId, transaction);
        const offer = await this.offers.findById(offerIdNumber, transaction);
        if (!offer || offer.requestId !== initialOffer.requestId) {
          throw new AppError('Oferta no encontrada', 404, 'OFFER_NOT_FOUND');
        }
        if (await this.offers.findAcceptedByRequestId(offer.requestId, transaction)) {
          throw new AppError('La solicitud ya tiene una oferta aceptada', 409, 'OFFER_ALREADY_ACCEPTED');
        }

        offer.accept();
        const accepted = await this.offers.save(offer, transaction);
        await this.offers.setAcceptedOffer(offer.requestId, offer.id, transaction);
        const others = await this.offers.findSubmittedByRequestId(offer.requestId, transaction);
        const rejected = [];
        for (const other of others) {
          if (other.id === accepted.id) continue;
          other.reject();
          rejected.push(await this.offers.save(other, transaction));
        }

        const common = {
          request_id: accepted.requestId,
          provider_id: accepted.providerId,
          buyer_id: Number(actor.id),
        };
        await this.outbox.add({
          topic: Topic.OFFER,
          routingKey: OfferEvent.OFFER_ACCEPTED,
          message: buildEvent({
            eventName: OfferEvent.OFFER_ACCEPTED,
            producer: 'offer-service',
            correlationId,
            payload: {
              ...common,
              offer_id: accepted.id,
              price: accepted.price,
              currency: accepted.currency,
              brand: accepted.brand,
              condition: accepted.condition,
              availability: accepted.availability,
              delivery_type: accepted.deliveryType,
              estimated_delivery_days: accepted.estimatedDeliveryDays,
              notes: accepted.notes,
            },
          }),
        }, transaction);
        for (const other of rejected) {
          await this.outbox.add({
            topic: Topic.OFFER,
            routingKey: OfferEvent.OFFER_REJECTED,
            message: buildEvent({
              eventName: OfferEvent.OFFER_REJECTED,
              producer: 'offer-service',
              correlationId,
              payload: {
                offer_id: other.id,
                request_id: other.requestId,
                provider_id: other.providerId,
                reason: 'NOT_SELECTED',
              },
            }),
          }, transaction);
        }
        return accepted;
      });
    } catch (error) {
      if (error.original?.code === '23505'
        && error.original.constraint === 'uq_one_accepted_offer_per_request') {
        throw new AppError('La solicitud ya tiene una oferta aceptada', 409, 'OFFER_ALREADY_ACCEPTED');
      }
      throw error;
    }
  }
}

module.exports = { AcceptOffer, requestOwnerId };
