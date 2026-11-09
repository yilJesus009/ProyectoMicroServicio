'use strict';

const express = require('express');
const { authenticate, requireRole } = require('./auth.middleware');
const upload = require('./upload.middleware');

/**
 * Rutas según docs/contratos-api.md (Negociación).
 * Prefijo montado en server.js: /api/v1/part-requests
 */
function createPartRequestRoutes(controller) {
  const router = express.Router();

  router.post('/', authenticate, requireRole('COMPRADOR'), upload, controller.create);
  router.get('/mine', authenticate, requireRole('COMPRADOR'), controller.mine);
  router.get('/open', authenticate, requireRole('PROVEEDOR'), controller.open);
  router.get('/:id', authenticate, controller.getById);
  router.get('/:id/photo', authenticate, controller.photo);
  router.patch('/:id/cancel', authenticate, requireRole('COMPRADOR'), controller.cancel);

  return router;
}

module.exports = { createPartRequestRoutes };
