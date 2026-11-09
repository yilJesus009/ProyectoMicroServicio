'use strict';

/**
 * Notificaciones — solo ensambla y arranca (docs/convenciones.md §6).
 *
 * Capas:
 *   domain/           regla de negocio pura (entidad, interfaces)
 *   application/      casos de uso (commands/queries) y puertos (unitOfWork)
 *   infrastructure/   PostgreSQL (Sequelize) y RabbitMQ
 *   presentation/http controllers delgados, middleware, rutas
 */

require('dotenv').config();

const path = require('path');
const express = require('express');

// .env del monorepo primero; un .env local del servicio (si existe) lo pisa.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const sequelize = require('./src/infrastructure/config/db.config');
const createNotificationModel = require('./src/infrastructure/persistence/notification.model');
const createSupplierModel = require('./src/infrastructure/persistence/supplier.model');
const createProcessedEventModel = require('./src/infrastructure/persistence/processedEvent.model');
const { SequelizeNotificationRepository } = require('./src/infrastructure/persistence/notificationRepository');
const { SequelizeSupplierRepository } = require('./src/infrastructure/persistence/supplierRepository');
const { SequelizeProcessedEventRepository } = require('./src/infrastructure/persistence/processedEventRepository');
const { SequelizeUnitOfWork } = require('./src/infrastructure/persistence/sequelizeUnitOfWork');
const { startNotificationsConsumer } = require('./src/infrastructure/messaging/notificationsConsumer');

const { ListMyNotifications } = require('./src/application/queries/listMyNotifications');
const { CountUnreadNotifications } = require('./src/application/queries/countUnreadNotifications');
const { ApplyNegotiationEvent } = require('./src/application/commands/applyNegotiationEvent');
const { MarkNotificationRead } = require('./src/application/commands/markNotificationRead');
const { MarkAllNotificationsRead } = require('./src/application/commands/markAllNotificationsRead');

const { createNotificationsController } = require('./src/presentation/http/notifications.controller');
const { createNotificationsRoutes } = require('./src/presentation/http/notifications.routes');
const { errorHandler, notFoundHandler } = require('./src/presentation/http/errorHandler');

const PORT = process.env.NOTIFICACIONES_PORT || 4005;

async function main() {
  // ---------------------------------------------------------------------
  // Infrastructure
  // ---------------------------------------------------------------------
  const NotificationModel = createNotificationModel(sequelize);
  const SupplierModel = createSupplierModel(sequelize);
  const ProcessedEventModel = createProcessedEventModel(sequelize);

  const notificationRepository = new SequelizeNotificationRepository(NotificationModel);
  const supplierRepository = new SequelizeSupplierRepository(SupplierModel);
  const processedEventRepository = new SequelizeProcessedEventRepository(ProcessedEventModel);
  const unitOfWork = new SequelizeUnitOfWork(sequelize);

  const amqpUrl = `amqp://${process.env.RABBITMQ_USER || 'guest'}:${
    process.env.RABBITMQ_PASS || 'guest'
  }@${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || 5672}`;

  // ---------------------------------------------------------------------
  // Application
  // ---------------------------------------------------------------------
  const listMyNotifications = new ListMyNotifications({ notificationRepository });
  const countUnreadNotifications = new CountUnreadNotifications({ notificationRepository });
  const applyNegotiationEvent = new ApplyNegotiationEvent({
    notificationRepository,
    supplierRepository,
    processedEventRepository,
    unitOfWork,
  });
  const markNotificationRead = new MarkNotificationRead({ notificationRepository });
  const markAllNotificationsRead = new MarkAllNotificationsRead({ notificationRepository });

  // ---------------------------------------------------------------------
  // Presentation
  // ---------------------------------------------------------------------
  const controller = createNotificationsController({
    listMyNotifications,
    countUnreadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  });

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'UP' });
  });

  app.use('/api/v1/notifications', createNotificationsRoutes(controller));
  app.use(notFoundHandler);
  app.use(errorHandler);

  // ---------------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------------
  try {
    await sequelize.authenticate();
    console.log('[db] PostgreSQL conectado (esquema notificaciones)');
    await sequelize.sync();
    console.log('[db] Modelos sincronizados');
  } catch (error) {
    console.error('[db] No se pudo conectar:', error.message);
    process.exit(1);
  }

  let consumer = null;
  try {
    consumer = await startNotificationsConsumer({ url: amqpUrl, applyNegotiationEvent });
    console.log('[rabbitmq] cola notificaciones.all lista, con los 7 bindings de la fase 2');
  } catch (error) {
    console.error('[rabbitmq] no se pudo conectar:', error.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`[http] notificaciones en http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    console.log('\n[http] Cerrando...');
    server.close();
    if (consumer) await consumer.close();
    await sequelize.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
