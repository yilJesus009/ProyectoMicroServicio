const express = require('express');
const { createAuthMiddleware } = require('../middleware/auth.middleware');
const { createServiceProxy } = require('../proxy/service.proxy');

function createApiRouter({ serviceUrls, jwtSecret }) {
  const router = express.Router();
  const requireAuth = createAuthMiddleware(jwtSecret);

  const identityProxy = createServiceProxy(serviceUrls.identity);
  const partRequestProxy = createServiceProxy(serviceUrls.partRequest);
  const offerProxy = createServiceProxy(serviceUrls.offer);
  const orderProxy = createServiceProxy(serviceUrls.order);
  const catalogProxy = createServiceProxy(serviceUrls.catalog);
  const notificationProxy = createServiceProxy(serviceUrls.notification);

  router.post('/auth/register', identityProxy);
  router.post('/auth/login', identityProxy);
  router.use('/auth', requireAuth, identityProxy);

  router.use('/part-requests', requireAuth, partRequestProxy);
  router.use('/offers', requireAuth, offerProxy);
  router.use('/orders', requireAuth, orderProxy);
  router.use(['/vehicles', '/parts'], requireAuth, catalogProxy);
  router.use('/notifications', requireAuth, notificationProxy);

  return router;
}

module.exports = { createApiRouter };
