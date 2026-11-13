'use strict';

const { AppError } = require('../../domain/errors/AppError');

class GetOrders {
  constructor({ orderRepository }) {
    this.orders = orderRepository;
  }

  async byId({ orderId, actor }) {
    const id = Number(orderId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new AppError('El identificador del pedido no es válido', 400, 'INVALID_INPUT');
    const order = await this.orders.findById(id);
    if (!order) throw new AppError('Pedido no encontrado', 404, 'ORDER_NOT_FOUND');
    const isBuyer = actor.roles.includes('COMPRADOR') && String(order.buyerId) === String(actor.id);
    const isProvider = actor.roles.includes('PROVEEDOR') && String(order.providerId) === String(actor.id);
    if (!actor.roles.includes('ADMIN') && !isBuyer && !isProvider) {
      throw new AppError('No tienes permiso para consultar este pedido', 403, 'FORBIDDEN');
    }
    return order;
  }

  async byBuyer({ buyerId, actor }) {
    const targetBuyerId = Number(buyerId);
    if (!Number.isSafeInteger(targetBuyerId) || targetBuyerId <= 0) {
      throw new AppError('buyer_id no es válido', 400, 'INVALID_INPUT');
    }
    if (!actor.roles.includes('COMPRADOR') && !actor.roles.includes('ADMIN')) {
      throw new AppError('Solo un comprador puede consultar sus pedidos', 403, 'FORBIDDEN');
    }
    if (String(targetBuyerId) !== String(actor.id) && !actor.roles.includes('ADMIN')) {
      throw new AppError('Solo puedes consultar tus propios pedidos', 403, 'FORBIDDEN');
    }
    return this.orders.listByBuyer(targetBuyerId);
  }

  async byProvider({ providerId, actor }) {
    const targetProviderId = Number(providerId);
    if (!Number.isSafeInteger(targetProviderId) || targetProviderId <= 0) {
      throw new AppError('provider_id no es válido', 400, 'INVALID_INPUT');
    }
    if (!actor.roles.includes('PROVEEDOR') && !actor.roles.includes('ADMIN')) {
      throw new AppError('Solo un proveedor puede consultar sus pedidos', 403, 'FORBIDDEN');
    }
    if (String(targetProviderId) !== String(actor.id) && !actor.roles.includes('ADMIN')) {
      throw new AppError('Solo puedes consultar tus propios pedidos', 403, 'FORBIDDEN');
    }
    return this.orders.listByProvider(targetProviderId);
  }
}

module.exports = { GetOrders };
