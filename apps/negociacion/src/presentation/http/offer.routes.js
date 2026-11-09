'use strict';

const express = require('express');
const { authenticate, requireRole } = require('./auth.middleware');

/**
 * Rutas según docs/contratos-api.md (Negociación — Ofertas).
 * Prefijo montado en server.js: /api/v1/offers
 */
function createOfferRoutes(controller) {
  const router = express.Router();

  router.get('/mine', authenticate, requireRole('PROVEEDOR'), controller.mine);
  router.patch('/:id/withdraw', authenticate, requireRole('PROVEEDOR'), controller.withdraw);
  router.post('/:id/accept', authenticate, requireRole('COMPRADOR'), controller.accept);

  return router;
}

module.exports = { createOfferRoutes };
