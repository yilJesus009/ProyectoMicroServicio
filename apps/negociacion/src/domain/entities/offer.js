'use strict';

const { OfferStatus, canTransitionOffer } = require('../enums');
const { InvalidOfferTransitionException } = require('../errors');

/**
 * Entidad Offer. Vive en domain/: no conoce Express, Sequelize ni RabbitMQ.
 */
class Offer {
  constructor({
    id = null,
    partRequestId,
    supplierId,
    supplierName,
    price,
    currency = 'BOB',
    brand,
    condition,
    availability,
    deliveryType,
    estimatedDays,
    notes = null,
    status,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.partRequestId = partRequestId;
    this.supplierId = supplierId;
    this.supplierName = supplierName;
    this.price = price;
    this.currency = currency;
    this.brand = brand;
    this.condition = condition;
    this.availability = availability;
    this.deliveryType = deliveryType;
    this.estimatedDays = estimatedDays;
    this.notes = notes;
    this.status = status ?? OfferStatus.SUBMITTED;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  assertCanTransition(newStatus) {
    if (!canTransitionOffer(this.status, newStatus)) {
      throw new InvalidOfferTransitionException(this.id, this.status, newStatus);
    }
  }

  changeStatus(newStatus) {
    this.assertCanTransition(newStatus);
    this.status = newStatus;
  }

  isOwnedBy(supplierId) {
    return this.supplierId === supplierId;
  }
}

module.exports = { Offer };
