'use strict';

const express = require('express');
const { AppError } = require('../../domain/errors/AppError');
const { authenticate, requireRole } = require('./auth');
const { errorHandler } = require('./errorHandler');

function createApp({ createOffer, acceptOffer, getOffers }) {
  const app = express();
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 200, msg: 'Servicio disponible', data: { service: 'offer-service' } });
  });

  app.post('/api/v1/offers', authenticate, requireRole('PROVEEDOR'), async (req, res, next) => {
    try {
      const offer = await createOffer.execute({
        actor: req.user,
        authorization: req.authorization,
        input: req.body,
        correlationId: req.correlationId,
      });
      res.status(201).json({ status: 201, msg: 'Oferta creada', data: offer.toJSON() });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/v1/offers', authenticate, async (req, res, next) => {
    try {
      let offers;
      if (req.query.request_id !== undefined) {
        if (!req.user.roles.includes('COMPRADOR') && !req.user.roles.includes('ADMIN')) {
          throw new AppError('Solo el solicitante puede consultar las ofertas de su solicitud', 403, 'FORBIDDEN');
        }
        offers = await getOffers.byRequest({
          requestId: req.query.request_id,
          actor: req.user,
          authorization: req.authorization,
        });
      } else if (req.query.provider_id !== undefined || req.user.roles.includes('PROVEEDOR')) {
        if (!req.user.roles.includes('PROVEEDOR') && !req.user.roles.includes('ADMIN')) {
          throw new AppError('Solo un proveedor puede consultar sus ofertas', 403, 'FORBIDDEN');
        }
        offers = await getOffers.byProvider({ providerId: req.query.provider_id, actor: req.user });
      } else {
        throw new AppError('Indica request_id o provider_id', 400, 'INVALID_INPUT');
      }
      res.status(200).json({ status: 200, msg: 'Ofertas consultadas', data: offers.map((offer) => offer.toJSON()) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/v1/offers/:id', authenticate, async (req, res, next) => {
    try {
      const offer = await getOffers.byId({
        offerId: req.params.id,
        actor: req.user,
        authorization: req.authorization,
      });
      res.status(200).json({ status: 200, msg: 'Oferta consultada', data: offer.toJSON() });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/v1/offers/:id/accept', authenticate, requireRole('COMPRADOR'), async (req, res, next) => {
    try {
      const offer = await acceptOffer.execute({
        offerId: req.params.id,
        actor: req.user,
        authorization: req.authorization,
        correlationId: req.correlationId,
      });
      res.status(200).json({ status: 200, msg: 'Oferta aceptada', data: offer.toJSON() });
    } catch (error) {
      next(error);
    }
  });

  app.use((req, res, next) => next(new AppError('Ruta no encontrada', 404, 'NOT_FOUND')));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
