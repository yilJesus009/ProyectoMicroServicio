'use strict';

const express = require('express');
const { authenticate } = require('./auth.middleware');

/**
 * Rutas según docs/contratos-api.md (Notificaciones).
 * Prefijo montado en server.js: /api/v1/notifications
 */
function createNotificationsRoutes(controller) {
  const router = express.Router();

  router.get('/mine', authenticate, controller.mine);
  router.get('/unread-count', authenticate, controller.unreadCount);

  return router;
}

module.exports = { createNotificationsRoutes };
