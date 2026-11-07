const express = require('express');
const { createAuthMiddleware } = require('../middleware/auth.middleware');
const { createServiceProxy } = require('../proxy/service.proxy');
const { createHealthHandler } = require('./health');

// Rutas por prefijo: docs/arquitectura.md -> Gateway.
//   /auth, /suppliers, /admin/suppliers          -> Identidad
//   /part-requests, /offers                      -> Negociacion
//   /orders                                      -> Pedidos
//   /categories, /vehicles, /admin/categories    -> Catalogo
//   /notifications                               -> Notificaciones
function createApiRouter({ serviceUrls, jwtSecret }) {
  const router = express.Router();
  const requireAuth = createAuthMiddleware(jwtSecret);

  const identidadProxy = createServiceProxy(serviceUrls.identidad);
  const negociacionProxy = createServiceProxy(serviceUrls.negociacion);
  const pedidosProxy = createServiceProxy(serviceUrls.pedidos);
  const catalogoProxy = createServiceProxy(serviceUrls.catalogo);
  const notificacionesProxy = createServiceProxy(serviceUrls.notificaciones);

  // Salud agregada: sin JWT, para la defensa.
  router.get('/health', createHealthHandler(serviceUrls));

  // --- Identidad ------------------------------------------------------------
  // Solo registro e inicio de sesion son publicos; el resto exige JWT
  // (docs/arquitectura.md). El orden importa: las dos publicas van primero.
  router.post('/auth/register', identidadProxy);
  router.post('/auth/login', identidadProxy);
  router.use('/auth', requireAuth, identidadProxy);

  router.use('/admin/suppliers', requireAuth, identidadProxy);
  router.use('/suppliers', requireAuth, identidadProxy);

  // --- Negociacion ----------------------------------------------------------
  router.use('/part-requests', requireAuth, negociacionProxy);
  router.use('/offers', requireAuth, negociacionProxy);

  // --- Pedidos --------------------------------------------------------------
  router.use('/orders', requireAuth, pedidosProxy);

  // --- Catalogo -------------------------------------------------------------
  router.use(['/categories', '/vehicles', '/admin/categories'], requireAuth, catalogoProxy);

  // --- Notificaciones -------------------------------------------------------
  router.use('/notifications', requireAuth, notificacionesProxy);

  return router;
}

module.exports = { createApiRouter };
