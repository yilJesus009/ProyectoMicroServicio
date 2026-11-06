'use strict';

const express = require('express');
const { authenticate, requireRole } = require('./auth.middleware');
const upload = require('./upload.middleware');

/**
 * Rutas según docs/contratos-api.md (Part Request Service).
 * Prefijo montado en server.js: /api/v1/part-requests
 */
function createPartRequestRoutes(controller) {
  const router = express.Router();

  router.post('/', authenticate, requireRole('COMPRADOR'), upload, controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.get('/:id/check-status', controller.checkStatus);
  router.patch('/:id/status', authenticate, controller.updateStatus);

  return router;
}

module.exports = { createPartRequestRoutes };
