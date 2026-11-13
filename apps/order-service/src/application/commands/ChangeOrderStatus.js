'use strict';

const { OrderEvent, Topic, buildEvent } = require('@repuestos/shared');
const { AppError } = require('../../domain/errors/AppError');

class ChangeOrderStatus {
  constructor({ orderRepository, outboxRepository }) {
    this.orders = orderRepository;
    this.outbox = outboxRepository;
  }

  async execute({ orderId, actor, nextStatus, correlationId }) {
    const id = Number(orderId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new AppError('El identificador del pedido no es válido', 400, 'INVALID_INPUT');
    }
    return this.orders.transaction(async (transaction) => {
      const order = await this.orders.findById(id, transaction);
      if (!order) throw new AppError('Pedido no encontrado', 404, 'ORDER_NOT_FOUND');
      const isBuyer = actor.roles?.includes('COMPRADOR')
        && String(order.buyerId) === String(actor.id);
      const isProvider = actor.roles?.includes('PROVEEDOR')
        && String(order.providerId) === String(actor.id);
      if (!isBuyer && !isProvider) {
        throw new AppError('No tienes permiso para modificar este pedido', 403, 'FORBIDDEN');
      }
      if (nextStatus === 'COMPLETED' && !isBuyer) {
        throw new AppError('Solo el comprador puede completar el pedido', 403, 'FORBIDDEN');
      }
      if (['PREPARING', 'SHIPPED', 'READY_FOR_PICKUP'].includes(nextStatus) && !isProvider) {
        throw new AppError('Solo el proveedor puede actualizar el estado de entrega', 403, 'FORBIDDEN');
      }
      if (nextStatus === 'DELIVERED') {
        const isPickup = order.deliveryType === 'PICKUP';
        if ((isPickup && !isBuyer) || (!isPickup && !isProvider)) {
          throw new AppError(
            isPickup ? 'Solo el comprador puede confirmar el retiro' : 'Solo el proveedor puede marcar el pedido como entregado',
            403,
            'FORBIDDEN',
          );
        }
      }
      if (nextStatus === 'CANCELLED' && !isBuyer && !isProvider) {
        throw new AppError('Solo el comprador o el proveedor pueden cancelar el pedido', 403, 'FORBIDDEN');
      }
      const previousStatus = order.changeStatus(nextStatus);
      const saved = await this.orders.save(order, transaction);
      await this.outbox.add({
        topic: Topic.ORDER,
        routingKey: OrderEvent.ORDER_STATUS_CHANGED,
        message: buildEvent({
          eventName: OrderEvent.ORDER_STATUS_CHANGED,
          producer: 'order-service',
          correlationId,
          payload: {
            order_id: saved.id,
            request_id: saved.requestId,
            offer_id: saved.offerId,
            buyer_id: saved.buyerId,
            provider_id: saved.providerId,
            previous_status: previousStatus,
            new_status: saved.status,
          },
        }),
      }, transaction);
      return saved;
    });
  }
}

module.exports = { ChangeOrderStatus };
