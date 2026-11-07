'use strict';

/**
 * Negociación — solo ensambla y arranca (docs/convenciones.md §6).
 *
 * Capas:
 *   domain/           regla de negocio pura (entidad, enums, errores, interfaces)
 *   application/      casos de uso (commands/queries) y puertos (unitOfWork, outbox)
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
const createOutboxEventModel = require('./src/infrastructure/persistence/outboxEvent.model');
const createProcessedEventModel = require('./src/infrastructure/persistence/processedEvent.model');
const { SequelizePartRequestRepository } = require('./src/infrastructure/persistence/partRequestRepository');
const { SequelizeOutboxRepository } = require('./src/infrastructure/persistence/outboxRepository');
const { SequelizeUnitOfWork } = require('./src/infrastructure/persistence/sequelizeUnitOfWork');
const { RabbitMqEventPublisher } = require('./src/infrastructure/messaging/rabbitMqEventPublisher');
const { startOutboxPublisherWorker } = require('./src/infrastructure/messaging/outboxPublisherWorker');

const { CreatePartRequest } = require('./src/application/commands/createPartRequest');
const { ChangePartRequestStatus } = require('./src/application/commands/changePartRequestStatus');
const { GetPartRequestById } = require('./src/application/queries/getPartRequestById');
const { SearchPartRequests } = require('./src/application/queries/searchPartRequests');

const { createPartRequestController } = require('./src/presentation/http/partRequest.controller');
const { createPartRequestRoutes } = require('./src/presentation/http/partRequest.routes');
const { errorHandler, notFoundHandler } = require('./src/presentation/http/errorHandler');

const PORT = process.env.NEGOCIACION_PORT || 4001;
const PRODUCER = 'negociacion';

async function main() {
  // ---------------------------------------------------------------------
  // Infrastructure (inyectada hacia las capas de adentro)
  // ---------------------------------------------------------------------
  const PartRequestModel = createPartRequestModel(sequelize);
  const OutboxEventModel = createOutboxEventModel(sequelize);
  createProcessedEventModel(sequelize); // tabla lista; el primer consumidor llega en fase 2

  const partRequestRepository = new SequelizePartRequestRepository(PartRequestModel);
  const outboxRepository = new SequelizeOutboxRepository(OutboxEventModel);
  const unitOfWork = new SequelizeUnitOfWork(sequelize);

  const amqpUrl = `amqp://${process.env.RABBITMQ_USER || 'guest'}:${
    process.env.RABBITMQ_PASS || 'guest'
  }@${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || 5672}`;

  const eventPublisher = new RabbitMqEventPublisher({ url: amqpUrl });

  // ---------------------------------------------------------------------
  // Application (casos de uso con dependencias inyectadas)
  // ---------------------------------------------------------------------
  const createPartRequest = new CreatePartRequest({
    partRequestRepository,
    outboxRepository,
    unitOfWork,
    producer: PRODUCER,
  });
  const changePartRequestStatus = new ChangePartRequestStatus({
    partRequestRepository,
    outboxRepository,
    unitOfWork,
    producer: PRODUCER,
  });
  const getPartRequestById = new GetPartRequestById({ partRequestRepository });
  const searchPartRequests = new SearchPartRequests({ partRequestRepository });

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
    res.json({ service: 'negociacion', status: 'OK' });
  });

  app.use('/api/v1/part-requests', createPartRequestRoutes(controller));
  app.use(notFoundHandler);
  app.use(errorHandler);

  // ---------------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------------
  try {
    await sequelize.authenticate();
    console.log('[db] PostgreSQL conectado (esquema negociacion)');
    await sequelize.sync(); // crea/actualiza las tablas de ESTE esquema
    console.log('[db] Modelos sincronizados');
  } catch (error) {
    console.error('[db] No se pudo conectar:', error.message);
    process.exit(1);
  }

  const outboxWorker = startOutboxPublisherWorker({ outboxRepository, eventPublisher });

  const server = app.listen(PORT, () => {
    console.log(`[http] negociacion en http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    console.log('\n[http] Cerrando...');
    outboxWorker.stop();
    server.close();
    await eventPublisher.close();
    await sequelize.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
