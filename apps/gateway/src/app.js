const express = require('express');
const cors = require('cors');
const { getServiceUrls } = require('./config/services');
const { clearIdentityHeaders } = require('./middleware/auth.middleware');
const {
  correlationIdMiddleware,
} = require('./middleware/correlation-id.middleware');
const { errorMiddleware } = require('./middleware/error.middleware');
const { createApiRouter } = require('./routes');

function createApp({
  serviceUrls = getServiceUrls(),
  jwtSecret = process.env.JWT_SECRET,
  frontendOrigin = process.env.FRONTEND_ORIGIN,
} = {}) {
  if (!frontendOrigin) {
    throw new Error('FRONTEND_ORIGIN es obligatorio para iniciar el API Gateway');
  }

  const app = express();

  app.disable('x-powered-by');
  app.use(
    cors({
      origin: frontendOrigin,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Correlation-Id'],
      exposedHeaders: ['X-Correlation-Id'],
    })
  );
  app.use(correlationIdMiddleware);
  app.use(clearIdentityHeaders);

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 200,
      msg: 'API Gateway disponible',
      data: { service: 'api-gateway' },
    });
  });

  app.use('/api/v1', createApiRouter({ serviceUrls, jwtSecret }));

  app.use((req, res) => {
    res.status(404).json({
      status: 404,
      msg: 'Ruta no encontrada',
      data: null,
    });
  });

  app.use(errorMiddleware);
  return app;
}

module.exports = { createApp };