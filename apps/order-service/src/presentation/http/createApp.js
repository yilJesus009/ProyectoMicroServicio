'use strict';

const express = require('express');
const { AppError } = require('../../domain/errors/AppError');
const { authenticate, requireRole } = require('./auth');
const { errorHandler } = require('./errorHandler');

function createApp({ getOrders, changeOrderStatus }) {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 200, msg: 'Servicio disponible', data: { service: 'order-service' } });
  });

  app.get('/api/v1/orders', authenticate, async (req, res, next) => {
    try {
      if (req.query.buyer_id !== undefined && req.query.provider_id !== undefined) {
        throw new AppError('Indica solo buyer_id o provider_id', 400, 'INVALID_INPUT');
      }
      let orders;
      const noFilter = req.query.buyer_id === undefined && req.query.provider_id === undefined;
      if (req.query.buyer_id !== undefined
        || (noFilter && req.user.roles.includes('COMPRADOR') && !req.user.roles.includes('PROVEEDOR'))) {
        if (!req.user.roles.includes('COMPRADOR') && !req.user.roles.includes('ADMIN')) {
          throw new AppError('Solo un comprador puede consultar sus pedidos', 403, 'FORBIDDEN');
        }
        orders = await getOrders.byBuyer({
          buyerId: req.query.buyer_id ?? req.user.id,
          actor: req.user,
        });
      } else if (req.query.provider_id !== undefined
        || (noFilter && req.user.roles.includes('PROVEEDOR') && !req.user.roles.includes('COMPRADOR'))) {
        if (!req.user.roles.includes('PROVEEDOR') && !req.user.roles.includes('ADMIN')) {
          throw new AppError('Solo un proveedor puede consultar sus pedidos', 403, 'FORBIDDEN');
        }
        orders = await getOrders.byProvider({
          providerId: req.query.provider_id ?? req.user.id,
          actor: req.user,
        });
      } else {
        throw new AppError('Indica buyer_id o provider_id', 400, 'INVALID_INPUT');
      }
      res.status(200).json({ status: 200, msg: 'Pedidos consultados', data: orders.map((order) => order.toJSON()) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/v1/orders/:id', authenticate, async (req, res, next) => {
    try {
      const order = await getOrders.byId({ orderId: req.params.id, actor: req.user });
      res.status(200).json({ status: 200, msg: 'Pedido consultado', data: order.toJSON() });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/v1/orders/:id/status', authenticate, requireRole('COMPRADOR', 'PROVEEDOR'), async (req, res, next) => {
    try {
      const order = await changeOrderStatus.execute({
        orderId: req.params.id,
        actor: req.user,
        nextStatus: req.body?.status,
        correlationId: req.correlationId,
      });
      res.status(200).json({ status: 200, msg: 'Estado del pedido actualizado', data: order.toJSON() });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/v1/orders/:id/complete', authenticate, requireRole('COMPRADOR'), async (req, res, next) => {
    try {
      const order = await changeOrderStatus.execute({
        orderId: req.params.id,
        actor: req.user,
        nextStatus: 'COMPLETED',
        correlationId: req.correlationId,
      });
      res.status(200).json({ status: 200, msg: 'Pedido completado', data: order.toJSON() });
    } catch (error) {
      next(error);
    }
  });

  app.use((req, res, next) => next(new AppError('Ruta no encontrada', 404, 'NOT_FOUND')));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
