'use strict';

const { Availability,
DeliveryType,
OrderStatus,
PartCondition, canTransition } = require('@repuestos/shared');
const { AppError } = require('../errors/AppError');

function validId(value, field) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AppError(`${field} no es válido`, 400, 'INVALID_EVENT');
  }
  return parsed;
}

class Order {
  constructor({
    id,
    requestId,
    offerId,
    buyerId,
    providerId,
    price,
    currency,
    brand,
    condition,
    availability,
    deliveryType,
    estimatedDeliveryDays,
    notes = null,
    status = OrderStatus.PENDING,
    createdAt,
    updatedAt,
  }) {
    this.id = id == null ? undefined : validId(id, 'id');
    this.requestId = validId(requestId, 'request_id');
    this.offerId = validId(offerId, 'offer_id');
    this.buyerId = validId(buyerId, 'buyer_id');
    this.providerId = validId(providerId, 'provider_id');
    const amount = String(price ?? '');
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 || currency !== 'BOB') {
      throw new AppError('El evento contiene un precio o moneda inválidos', 400, 'INVALID_EVENT');
    }
    if (typeof brand !== 'string' || !brand.trim() || brand.trim().length > 120
      || !Object.values(PartCondition).includes(condition)
      || !Object.values(Availability).includes(availability)
      || !Object.values(DeliveryType).includes(deliveryType)) {
      throw new AppError('El evento no contiene la instantánea completa de la oferta', 400, 'INVALID_EVENT');
    }
    const daysValue = String(estimatedDeliveryDays ?? '');
    const days = Number(daysValue);
    if (!/^\d+$/.test(daysValue) || !Number.isSafeInteger(days) || days < 0) {
      throw new AppError('estimated_delivery_days no es válido', 400, 'INVALID_EVENT');
    }
    if (notes != null && (typeof notes !== 'string' || notes.length > 1000)) {
      throw new AppError('notes no es válido', 400, 'INVALID_EVENT');
    }
    if (!Object.values(OrderStatus).includes(status)) {
      throw new AppError('El estado inicial del pedido no es válido', 400, 'INVALID_EVENT');
    }
    this.price = Number(amount).toFixed(2);
    this.currency = currency;
    this.brand = brand.trim();
    this.condition = condition;
    this.availability = availability;
    this.deliveryType = deliveryType;
    this.estimatedDeliveryDays = days;
    this.notes = notes == null ? null : notes.trim();
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  changeStatus(nextStatus) {
    if (!Object.values(OrderStatus).includes(nextStatus) || !canTransition(this.status, nextStatus)) {
      throw new AppError(`Transición de pedido inválida: ${this.status} -> ${nextStatus}`, 422, 'INVALID_TRANSITION');
    }
    if (nextStatus === OrderStatus.SHIPPED && this.deliveryType !== DeliveryType.DELIVERY) {
      throw new AppError('Un pedido para retiro en tienda no puede marcarse como enviado', 422, 'INVALID_TRANSITION');
    }
    if (nextStatus === OrderStatus.READY_FOR_PICKUP && this.deliveryType !== DeliveryType.PICKUP) {
      throw new AppError('Un pedido con entrega no puede marcarse listo para retiro', 422, 'INVALID_TRANSITION');
    }
    if (nextStatus === OrderStatus.DELIVERED) {
      const expectedPrevious = this.deliveryType === DeliveryType.PICKUP
        ? OrderStatus.READY_FOR_PICKUP
        : OrderStatus.SHIPPED;
      if (this.status !== expectedPrevious) {
        throw new AppError('El pedido debe seguir el flujo correspondiente a su modalidad de entrega', 422, 'INVALID_TRANSITION');
      }
    }
    const previousStatus = this.status;
    this.status = nextStatus;
    return previousStatus;
  }

  toJSON() {
    return {
      id: this.id,
      request_id: this.requestId,
      offer_id: this.offerId,
      buyer_id: this.buyerId,
      provider_id: this.providerId,
      price: this.price,
      currency: this.currency,
      brand: this.brand,
      condition: this.condition,
      availability: this.availability,
      delivery_type: this.deliveryType,
      estimated_delivery_days: this.estimatedDeliveryDays,
      notes: this.notes,
      status: this.status,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }
}

module.exports = { Order };
