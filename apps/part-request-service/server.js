'use strict';

/**
 * Part Request Service — solo ensambla y arranca (docs/convenciones.md §6).
 *
 * Capas:
 *   domain/           regla de negocio pura (entidad, enums, errores, interfaces)
 *   application/      casos de uso (commands/queries) y puertos
 *   infrastructure/   PostgreSQL (Sequelize) y RabbitMQ
 *   presentation/http controllers delgados, middleware, rutas
 */

require('dotenv').config();

const path = require('path');
const express = require('express');

// .env del monorepo primero; un .env local del servicio (si existe) lo pisa.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const sequelize = require('./src/infrastructure/config/db.config');
const createPartRequestModel = require('./src/infrastructure/persistence/partRequest.model');
const { SequelizePartRequestRepository } = require('./src/infrastructure/persistence/partRequestRepository');
const { RabbitMqEventPublisher } = require('./src/infrastructure/messaging/rabbitMqEventPublisher');

const { CreatePartRequest } = require('./src/application/commands/createPartRequest');
const { ChangePartRequestStatus } = require('./src/application/commands/changePartRequestStatus');
const { GetPartRequestById } = require('./src/application/queries/getPartRequestById');
const { SearchPartRequests } = require('./src/application/queries/searchPartRequests');

const { createPartRequestController } = require('./src/presentation/http/partRequest.controller');
const { createPartRequestRoutes } = require('./src/presentation/http/partRequest.routes');
const { errorHandler, notFoundHandler } = require('./src/presentation/http/errorHandler');

const PORT = process.env.PART_REQUEST_PORT || 4001;

async function main() {
  // ---------------------------------------------------------------------
  // Infrastructure (inyectada hacia las capas de adentro)
  // ---------------------------------------------------------------------
  const PartRequestModel = createPartRequestModel(sequelize);
  const repository = new SequelizePartRequestRepository(PartRequestModel);

  const amqpUrl = `amqp://${process.env.RABBITMQ_USER || 'guest'}:${
    process.env.RABBITMQ_PASS || 'guest'
  }@${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || 5672}`;

  const eventPublisher = new RabbitMqEventPublisher({
    url: amqpUrl,
    producer: 'part-request-service',
  });

  // ---------------------------------------------------------------------
  // Application (casos de uso con dependencias inyectadas)
  // ---------------------------------------------------------------------
  const createPartRequest = new CreatePartRequest({
    partRequestRepository: repository,
    eventPublisher,
  });
  const changePartRequestStatus = new ChangePartRequestStatus({
    partRequestRepository: repository,
    eventPublisher,
  });
  const getPartRequestById = new GetPartRequestById({ partRequestRepository: repository });
  const searchPartRequests = new SearchPartRequests({ partRequestRepository: repository });

  // ---------------------------------------------------------------------
  // Presentation
  // ---------------------------------------------------------------------
  const controller = createPartRequestController({
    createPartRequest,
    changePartRequestStatus,
    getPartRequestById,
    searchPartRequests,
  });

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({ service: 'part-request-service', status: 'OK' });
  });

  app.use('/api/v1/part-requests', createPartRequestRoutes(controller));
  app.use(notFoundHandler);
  app.use(errorHandler);

  // ---------------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------------
  try {
    await sequelize.authenticate();
    console.log('[db] PostgreSQL conectado');
    await sequelize.sync(); // crea/actualiza las tablas de ESTE servicio
    console.log('[db] Modelos sincronizados');
  } catch (error) {
    console.error('[db] No se pudo conectar:', error.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`[http] part-request-service en http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    console.log('\n[http] Cerrando...');
    server.close();
    await eventPublisher.close();
    await sequelize.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
