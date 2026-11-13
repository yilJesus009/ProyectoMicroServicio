'use strict';

const {
  Availability,
  DeliveryType,
  OfferStatus,
  PartCondition,
} = require('@repuestos/shared');
const { AppError } = require('../errors/AppError');

const enumValues = (value) => Object.values(value);

function requiredId(value, field) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AppError(`${field} debe ser un identificador válido`, 400, 'INVALID_INPUT');
  }
  return parsed;
}

function normalizePrice(value) {
  const price = String(value ?? '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
    throw new AppError('El precio debe ser mayor que cero y tener hasta dos decimales', 400, 'INVALID_PRICE');
  }
  return Number(price).toFixed(2);
}

class Offer {
  constructor({
    id,
    requestId,
    providerId,
    price,
    currency = 'BOB',
    brand,
    condition,
    availability,
    deliveryType,
    estimatedDeliveryDays,
    notes = null,
    status = OfferStatus.SUBMITTED,
    createdAt,
    updatedAt,
  }) {
    this.id = id == null ? undefined : requiredId(id, 'id');
    this.requestId = requiredId(requestId, 'request_id');
    this.providerId = requiredId(providerId, 'provider_id');
    this.price = normalizePrice(price);
    if (currency !== 'BOB') {
      throw new AppError('La única moneda admitida es BOB', 400, 'INVALID_CURRENCY');
    }
    this.currency = currency;
    this.brand = typeof brand === 'string' ? brand.trim() : '';
    if (!this.brand || this.brand.length > 120) {
      throw new AppError('brand es obligatorio y no debe superar 120 caracteres', 400, 'INVALID_INPUT');
    }
    if (!enumValues(PartCondition).includes(condition)) {
      throw new AppError('condition no es válido', 400, 'INVALID_INPUT');
    }
    if (!enumValues(Availability).includes(availability)) {
      throw new AppError('availability no es válido', 400, 'INVALID_INPUT');
    }
    if (!enumValues(DeliveryType).includes(deliveryType)) {
      throw new AppError('delivery_type no es válido', 400, 'INVALID_INPUT');
    }
    const daysValue = String(estimatedDeliveryDays ?? '');
    const days = Number(daysValue);
    if (!/^\d+$/.test(daysValue) || !Number.isSafeInteger(days) || days < 0) {
      throw new AppError('estimated_delivery_days debe ser un entero no negativo', 400, 'INVALID_INPUT');
    }
    this.condition = condition;
    this.availability = availability;
    this.deliveryType = deliveryType;
    this.estimatedDeliveryDays = days;
    if (notes != null && typeof notes !== 'string') {
      throw new AppError('notes debe ser texto', 400, 'INVALID_INPUT');
    }
    this.notes = notes == null ? null : notes.trim();
    if (this.notes && this.notes.length > 1000) {
      throw new AppError('notes no debe superar 1000 caracteres', 400, 'INVALID_INPUT');
    }
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  accept() {
    if (this.status !== OfferStatus.SUBMITTED) {
      throw new AppError('Solo se puede aceptar una oferta pendiente', 409, 'OFFER_NOT_PENDING');
    }
    this.status = OfferStatus.ACCEPTED;
  }

  reject() {
    if (this.status !== OfferStatus.SUBMITTED) {
      throw new AppError('Solo se pueden rechazar ofertas pendientes', 409, 'OFFER_NOT_PENDING');
    }
    this.status = OfferStatus.REJECTED;
  }

  toJSON() {
    return {
      id: this.id,
      request_id: this.requestId,
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

module.exports = { Offer, normalizePrice, requiredId };
