'use strict';

const { OrderEvent, OrderStatus, Topic, buildEvent } = require('@repuestos/shared');
const { Order } = require('../../domain/entities/Order');
const { AppError } = require('../../domain/errors/AppError');

function validateEnvelope(event) {
  if (!event
    || event.event_name !== 'OFFER_ACCEPTED'
    || !event.payload
    || typeof event.payload !== 'object'
    || Array.isArray(event.payload)
    || typeof event.occurred_at !== 'string'
    || Number.isNaN(Date.parse(event.occurred_at))
    || typeof event.correlation_id !== 'string'
    || !event.correlation_id.trim()
    || event.correlation_id.length > 100
    || event.producer !== 'offer-service') {
    throw new AppError('Evento OFFER_ACCEPTED inválido', 400, 'INVALID_EVENT');
  }
}

class ProcessOfferAccepted {
  constructor({ orderRepository, outboxRepository }) {
    this.orders = orderRepository;
    this.outbox = outboxRepository;
  }

  async execute(event) {
    validateEnvelope(event);
    const eventKey = `${event.event_name}:${event.occurred_at}:${event.correlation_id}`;
    return this.orders.transaction(async (transaction) => {
      if (await this.orders.wasProcessed(eventKey, transaction)) {
        return { duplicate: true, order: null };
      }

      const payload = event.payload;
      const order = new Order({
        requestId: payload.request_id,
        offerId: payload.offer_id,
        buyerId: payload.buyer_id,
        providerId: payload.provider_id,
        price: payload.price,
        currency: payload.currency,
        brand: payload.brand,
        condition: payload.condition,
        availability: payload.availability,
        deliveryType: payload.delivery_type,
        estimatedDeliveryDays: payload.estimated_delivery_days,
        notes: payload.notes,
        status: OrderStatus.PENDING,
      });
      const existing = await this.orders.findByOfferId(payload.offer_id, transaction);
      if (existing) {
        if (existing.requestId !== order.requestId
          || existing.buyerId !== order.buyerId
          || existing.providerId !== order.providerId
          || existing.price !== order.price
          || existing.currency !== order.currency
          || existing.brand !== order.brand
          || existing.condition !== order.condition
          || existing.availability !== order.availability
          || existing.deliveryType !== order.deliveryType
          || existing.estimatedDeliveryDays !== order.estimatedDeliveryDays
          || existing.notes !== order.notes) {
          throw new AppError('La oferta ya está asociada a un pedido con datos diferentes', 409, 'ORDER_CONFLICT');
        }
        await this.orders.markProcessed(eventKey, event.correlation_id, transaction);
        return { duplicate: true, order: existing };
      }

      const saved = await this.orders.save(order, transaction);
      await this.orders.markProcessed(eventKey, event.correlation_id, transaction);
      await this.outbox.add({
        topic: Topic.ORDER,
        routingKey: OrderEvent.ORDER_CREATED,
        message: buildEvent({
          eventName: OrderEvent.ORDER_CREATED,
          producer: 'order-service',
          correlationId: event.correlation_id,
          payload: {
            order_id: saved.id,
            request_id: saved.requestId,
            offer_id: saved.offerId,
            buyer_id: saved.buyerId,
            provider_id: saved.providerId,
            total_price: saved.price,
            currency: saved.currency,
            brand: saved.brand,
            condition: saved.condition,
            availability: saved.availability,
            delivery_type: saved.deliveryType,
            estimated_delivery_days: saved.estimatedDeliveryDays,
            status: saved.status,
          },
        }),
      }, transaction);
      return { duplicate: false, order: saved };
    });
  }
}

module.exports = { ProcessOfferAccepted, validateEnvelope };
