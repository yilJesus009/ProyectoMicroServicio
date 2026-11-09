'use strict';

/**
 * Negociación — solo ensambla y arranca (docs/convenciones.md §6).
 *
 * Capas:
 *   domain/           regla de negocio pura (entidad, enums, errores, interfaces)
 *   application/      casos de uso (commands/queries) y puertos (unitOfWork, outbox, categoryGateway)
 *   infrastructure/   PostgreSQL (Sequelize), RabbitMQ y el cliente HTTP hacia Catálogo
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
const createSupplierModel = require('./src/infrastructure/persistence/supplier.model');
const createOfferModel = require('./src/infrastructure/persistence/offer.model');
const { SequelizePartRequestRepository } = require('./src/infrastructure/persistence/partRequestRepository');
const { SequelizeOutboxRepository } = require('./src/infrastructure/persistence/outboxRepository');
const { SequelizeProcessedEventRepository } = require('./src/infrastructure/persistence/processedEventRepository');
const { SequelizeSupplierRepository } = require('./src/infrastructure/persistence/supplierRepository');
const { SequelizeOfferRepository } = require('./src/infrastructure/persistence/offerRepository');
const { SequelizeUnitOfWork } = require('./src/infrastructure/persistence/sequelizeUnitOfWork');
const { RabbitMqEventPublisher } = require('./src/infrastructure/messaging/rabbitMqEventPublisher');
const { startOutboxPublisherWorker } = require('./src/infrastructure/messaging/outboxPublisherWorker');
const { startSupplierEventsConsumer } = require('./src/infrastructure/messaging/supplierEventsConsumer');
const { CatalogHttpClient } = require('./src/infrastructure/http/catalogHttpClient');

const { CreatePartRequest } = require('./src/application/commands/createPartRequest');
const { ChangePartRequestStatus } = require('./src/application/commands/changePartRequestStatus');
const { ApplySupplierEvent } = require('./src/application/commands/applySupplierEvent');
const { SubmitOffer } = require('./src/application/commands/submitOffer');
const { WithdrawOffer } = require('./src/application/commands/withdrawOffer');
const { AcceptOffer } = require('./src/application/commands/acceptOffer');
const { GetPartRequestById } = require('./src/application/queries/getPartRequestById');
const { ListMyPartRequests } = require('./src/application/queries/listMyPartRequests');
const { ListOpenPartRequests } = require('./src/application/queries/listOpenPartRequests');
const { ListPartRequestOffers } = require('./src/application/queries/listPartRequestOffers');
const { ListMyOffers } = require('./src/application/queries/listMyOffers');

const { createPartRequestController, toResponse } = require('./src/presentation/http/partRequest.controller');
const { createOfferController } = require('./src/presentation/http/offer.controller');
const { createPartRequestRoutes } = require('./src/presentation/http/partRequest.routes');
const { createOfferRoutes } = require('./src/presentation/http/offer.routes');
const { errorHandler, notFoundHandler } = require('./src/presentation/http/errorHandler');

const PORT = process.env.NEGOCIACION_PORT || 4001;
const PRODUCER = 'negociacion';

async function main() {
  // ---------------------------------------------------------------------
  // Infrastructure (inyectada hacia las capas de adentro)
  // ---------------------------------------------------------------------
  const PartRequestModel = createPartRequestModel(sequelize);
  const OutboxEventModel = createOutboxEventModel(sequelize);
  const ProcessedEventModel = createProcessedEventModel(sequelize);
  const SupplierModel = createSupplierModel(sequelize);
  const OfferModel = createOfferModel(sequelize);

  const partRequestRepository = new SequelizePartRequestRepository(PartRequestModel);
  const outboxRepository = new SequelizeOutboxRepository(OutboxEventModel);
  const processedEventRepository = new SequelizeProcessedEventRepository(ProcessedEventModel);
  const supplierRepository = new SequelizeSupplierRepository(SupplierModel);
  const offerRepository = new SequelizeOfferRepository(OfferModel);
  const unitOfWork = new SequelizeUnitOfWork(sequelize);

  const categoryGateway = new CatalogHttpClient({
    baseUrl: process.env.CATALOGO_SERVICE_URL || 'http://catalogo:4004',
  });

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
    categoryGateway,
    producer: PRODUCER,
  });
  const changePartRequestStatus = new ChangePartRequestStatus({
    partRequestRepository,
    outboxRepository,
    unitOfWork,
    producer: PRODUCER,
  });
  const applySupplierEvent = new ApplySupplierEvent({
    supplierRepository,
    processedEventRepository,
    unitOfWork,
  });
  const getPartRequestById = new GetPartRequestById({ partRequestRepository, supplierRepository });
  const listMyPartRequests = new ListMyPartRequests({ partRequestRepository });
  const listOpenPartRequests = new ListOpenPartRequests({ partRequestRepository, supplierRepository });
  const submitOffer = new SubmitOffer({
    partRequestRepository,
    offerRepository,
    supplierRepository,
    outboxRepository,
    unitOfWork,
    producer: PRODUCER,
  });
  const withdrawOffer = new WithdrawOffer({ partRequestRepository, offerRepository, unitOfWork });
  const acceptOffer = new AcceptOffer({
    partRequestRepository,
    offerRepository,
    outboxRepository,
    unitOfWork,
    producer: PRODUCER,
  });
  const listPartRequestOffers = new ListPartRequestOffers({ partRequestRepository, offerRepository });
  const listMyOffers = new ListMyOffers({ offerRepository });

  // ---------------------------------------------------------------------
  // Presentation
  // ---------------------------------------------------------------------
  const controller = createPartRequestController({
    createPartRequest,
    cancelPartRequest: changePartRequestStatus,
    getPartRequestById,
    listMyPartRequests,
    listOpenPartRequests,
  });
  const offerController = createOfferController({
    submitOffer,
    withdrawOffer,
    acceptOffer,
    listPartRequestOffers,
    listMyOffers,
    toPartRequestResponse: toResponse,
  });

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({ service: 'negociacion', status: 'OK' });
  });

  app.use('/api/v1/part-requests', createPartRequestRoutes(controller, offerController));
  app.use('/api/v1/offers', createOfferRoutes(offerController));
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
  const supplierConsumer = await startSupplierEventsConsumer({ url: amqpUrl, applySupplierEvent });

  const server = app.listen(PORT, () => {
    console.log(`[http] negociacion en http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    console.log('\n[http] Cerrando...');
    outboxWorker.stop();
    await supplierConsumer.close();
    server.close();
    await eventPublisher.close();
    await sequelize.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
