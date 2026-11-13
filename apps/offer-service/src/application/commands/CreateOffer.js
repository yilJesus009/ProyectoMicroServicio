'use strict';

const { Offer } = require('../../domain/entities/Offer');
const { AppError } = require('../../domain/errors/AppError');
const { buildEvent, OfferEvent, Topic } = require('@repuestos/shared');

class CreateOffer {
  constructor({ offerRepository, requestClient, outboxRepository }) {
    this.offers = offerRepository;
    this.requests = requestClient;
    this.outbox = outboxRepository;
  }

  async execute({ actor, authorization, input, correlationId }) {
    const data = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const requestId = Number(data.request_id);
    if (!Number.isSafeInteger(requestId) || requestId <= 0) {
      throw new AppError('request_id debe ser un identificador válido', 400, 'INVALID_INPUT');
    }
    const request = await this.requests.findById(requestId, authorization);
    const status = request.status ?? request.state ?? request.estado;
    if (status !== 'PUBLISHED') {
      throw new AppError('La solicitud no admite nuevas ofertas', 422, 'PART_REQUEST_CLOSED');
    }

    const offer = new Offer({
      requestId,
      providerId: actor.id,
      price: data.price,
      currency: data.currency ?? 'BOB',
      brand: data.brand,
      condition: data.condition,
      availability: data.availability,
      deliveryType: data.delivery_type,
      estimatedDeliveryDays: data.estimated_delivery_days,
      notes: data.notes,
    });
    const saved = await this.offers.transaction(async (transaction) => {
      await this.offers.lockRequestAcceptance(requestId, transaction);
      if (await this.offers.findAcceptedByRequestId(requestId, transaction)) {
        throw new AppError('La solicitud ya tiene una oferta aceptada', 422, 'PART_REQUEST_CLOSED');
      }
      const created = await this.offers.save(offer, transaction);
      await this.outbox.add({
        topic: Topic.OFFER,
        routingKey: OfferEvent.OFFER_SUBMITTED,
        message: buildEvent({
          eventName: OfferEvent.OFFER_SUBMITTED,
          producer: 'offer-service',
          correlationId,
          payload: {
            offer_id: created.id,
            request_id: created.requestId,
            provider_id: created.providerId,
            price: created.price,
            currency: created.currency,
            brand: created.brand,
            condition: created.condition,
            availability: created.availability,
            delivery_type: created.deliveryType,
            estimated_delivery_days: created.estimatedDeliveryDays,
            notes: created.notes,
          },
        }),
      }, transaction);
      return created;
    });
    return saved;
  }
}

module.exports = { CreateOffer };
