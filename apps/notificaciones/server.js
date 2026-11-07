'use strict';

/**
 * Notificaciones — solo ensambla y arranca (docs/convenciones.md §6).
 *
 * Capas:
 *   domain/           regla de negocio pura (entidad, interfaces)
 *   application/      casos de uso (queries)
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
const { startNotificationsConsumer } = require('./src/infrastructure/messaging/notificationsConsumer');

const { ListMyNotifications } = require('./src/application/queries/listMyNotifications');
const { CountUnreadNotifications } = require('./src/application/queries/countUnreadNotifications');

const { createNotificationsController } = require('./src/presentation/http/notifications.controller');
const { createNotificationsRoutes } = require('./src/presentation/http/notifications.routes');
const { errorHandler, notFoundHandler } = require('./src/presentation/http/errorHandler');

const PORT = process.env.NOTIFICACIONES_PORT || 4005;

async function main() {
  // ---------------------------------------------------------------------
  // Infrastructure
  // ---------------------------------------------------------------------
  const NotificationModel = createNotificationModel(sequelize);
  createSupplierModel(sequelize); // tabla lista; sin datos hasta la fase 2
  createProcessedEventModel(sequelize); // tabla lista; sin consumidor con bindings todavía

  const notificationRepository = new SequelizeNotificationRepository(NotificationModel);

  const amqpUrl = `amqp://${process.env.RABBITMQ_USER || 'guest'}:${
    process.env.RABBITMQ_PASS || 'guest'
  }@${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || 5672}`;

  // ---------------------------------------------------------------------
  // Application
  // ---------------------------------------------------------------------
  const listMyNotifications = new ListMyNotifications({ notificationRepository });
  const countUnreadNotifications = new CountUnreadNotifications({ notificationRepository });

  // ---------------------------------------------------------------------
  // Presentation
  // ---------------------------------------------------------------------
  const controller = createNotificationsController({ listMyNotifications, countUnreadNotifications });

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
    consumer = await startNotificationsConsumer({
      url: amqpUrl,
      onMessage: async (envelope) => {
        console.log('[notificaciones-consumer] mensaje recibido:', envelope.event_name);
      },
    });
    console.log('[rabbitmq] cola notificaciones.all lista (sin bindings todavía)');
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
