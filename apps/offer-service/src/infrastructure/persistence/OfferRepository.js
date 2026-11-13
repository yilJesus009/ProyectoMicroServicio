'use strict';

const { Offer } = require('../../domain/entities/Offer');
const { OfferModel, RequestAcceptanceModel } = require('./models');
const { sequelize } = require('../config/database');

function toEntity(row) {
  return row ? new Offer(row.get({ plain: true })) : null;
}

class OfferRepository {
  transaction(work) {
    return sequelize.transaction(work);
  }

  async save(offer, transaction) {
    const values = {
      requestId: offer.requestId,
      providerId: offer.providerId,
      price: offer.price,
      currency: offer.currency,
      brand: offer.brand,
      condition: offer.condition,
      availability: offer.availability,
      deliveryType: offer.deliveryType,
      estimatedDeliveryDays: offer.estimatedDeliveryDays,
      notes: offer.notes,
      status: offer.status,
    };
    if (offer.id) {
      const row = await OfferModel.findByPk(offer.id, { transaction, lock: transaction?.LOCK.UPDATE });
      if (!row) return null;
      await row.update(values, { transaction });
      return toEntity(row);
    }
    const row = await OfferModel.create(values, { transaction });
    return toEntity(row);
  }

  async findById(id, transaction) {
    return toEntity(await OfferModel.findByPk(id, {
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined,
    }));
  }

  async findByRequestId(requestId) {
    return (await OfferModel.findAll({
      where: { requestId },
      order: [['createdAt', 'ASC'], ['id', 'ASC']],
    })).map(toEntity);
  }

  async findByProviderId(providerId) {
    return (await OfferModel.findAll({
      where: { providerId },
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
    })).map(toEntity);
  }

  async findAcceptedByRequestId(requestId, transaction) {
    return toEntity(await OfferModel.findOne({
      where: { requestId, status: 'ACCEPTED' },
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined,
    }));
  }

  async findSubmittedByRequestId(requestId, transaction) {
    return (await OfferModel.findAll({
      where: { requestId, status: 'SUBMITTED' },
      order: [['id', 'ASC']],
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined,
    })).map(toEntity);
  }

  async lockRequestAcceptance(requestId, transaction) {
    await sequelize.query(
      `INSERT INTO request_acceptances (request_id, created_at, updated_at)
       VALUES (:requestId, NOW(), NOW())
       ON CONFLICT (request_id) DO NOTHING`,
      { replacements: { requestId }, transaction },
    );
    return RequestAcceptanceModel.findByPk(requestId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  async setAcceptedOffer(requestId, offerId, transaction) {
    await RequestAcceptanceModel.update(
      { acceptedOfferId: offerId },
      { where: { requestId }, transaction },
    );
  }
}

module.exports = { OfferRepository };
