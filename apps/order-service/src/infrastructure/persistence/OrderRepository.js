'use strict';

const { Order } = require('../../domain/entities/Order');
const { OrderModel, ProcessedEventModel } = require('./models');
const { sequelize } = require('../config/database');

function toEntity(row) {
  return row ? new Order(row.get({ plain: true })) : null;
}

class OrderRepository {
  transaction(work) {
    return sequelize.transaction(work);
  }

  async findById(id, transaction) {
    return toEntity(await OrderModel.findByPk(id, {
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined,
    }));
  }

  async findByOfferId(offerId, transaction) {
    return toEntity(await OrderModel.findOne({ where: { offerId }, transaction }));
  }

  async save(order, transaction) {
    const values = {
      requestId: order.requestId,
      offerId: order.offerId,
      buyerId: order.buyerId,
      providerId: order.providerId,
      price: order.price,
      currency: order.currency,
      brand: order.brand,
      condition: order.condition,
      availability: order.availability,
      deliveryType: order.deliveryType,
      estimatedDeliveryDays: order.estimatedDeliveryDays,
      notes: order.notes,
      status: order.status,
    };
    if (order.id) {
      const row = await OrderModel.findByPk(order.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!row) return null;
      await row.update(values, { transaction });
      return toEntity(row);
    }
    return toEntity(await OrderModel.create(values, { transaction }));
  }

  async listByBuyer(buyerId) {
    return (await OrderModel.findAll({
      where: { buyerId },
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
    })).map(toEntity);
  }

  async listByProvider(providerId) {
    return (await OrderModel.findAll({
      where: { providerId },
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
    })).map(toEntity);
  }

  async wasProcessed(eventKey, transaction) {
    return Boolean(await ProcessedEventModel.findByPk(eventKey, { transaction }));
  }

  async markProcessed(eventKey, correlationId, transaction) {
    return ProcessedEventModel.create({ eventKey, correlationId }, { transaction });
  }

}

module.exports = { OrderRepository };
