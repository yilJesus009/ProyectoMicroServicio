'use strict';

require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const { sequelize } = require('./infrastructure/config/database');
const { OrderRepository } = require('./infrastructure/persistence/OrderRepository');
const { OutboxRepository } = require('./infrastructure/persistence/OutboxRepository');
const { ProcessOfferAccepted } = require('./application/commands/ProcessOfferAccepted');
const { ChangeOrderStatus } = require('./application/commands/ChangeOrderStatus');
const { GetOrders } = require('./application/queries/GetOrders');
const { RabbitPublisher } = require('./infrastructure/messaging/RabbitPublisher');
const { OutboxDispatcher } = require('./infrastructure/messaging/OutboxDispatcher');
const { OfferAcceptedConsumer } = require('./infrastructure/messaging/OfferAcceptedConsumer');
const { createApp } = require('./presentation/http/createApp');

async function start() {
  const required = [
    'JWT_SECRET', 'ORDER_PORT', 'DB_ORDER_NAME', 'DB_ORDER_USER',
    'DB_ORDER_PASSWORD', 'DB_ORDER_HOST', 'DB_ORDER_PORT',
    'RABBITMQ_HOST', 'RABBITMQ_PORT', 'RABBITMQ_USER', 'RABBITMQ_PASS',
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Faltan variables requeridas: ${missing.join(', ')}`);
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  }
  await sequelize.authenticate();
  await sequelize.sync();
  const migration = await fs.readFile(path.join(__dirname, '../migrations/001-invariants.sql'), 'utf8');
  await sequelize.query(migration);

  const orderRepository = new OrderRepository();
  const outboxRepository = new OutboxRepository();
  const publisher = new RabbitPublisher();
  const dispatcher = new OutboxDispatcher({ repository: outboxRepository, publisher });
  dispatcher.start();
  const consumer = new OfferAcceptedConsumer({
    handler: new ProcessOfferAccepted({ orderRepository, outboxRepository }),
  });
  consumer.start();

  const app = createApp({
    getOrders: new GetOrders({ orderRepository }),
    changeOrderStatus: new ChangeOrderStatus({ orderRepository, outboxRepository }),
  });
  const server = app.listen(Number(process.env.ORDER_PORT), () => {
    console.log(`order-service escuchando en el puerto ${process.env.ORDER_PORT}`);
  });

  const shutdown = async () => {
    dispatcher.stop();
    await consumer.stop();
    server.close();
    await publisher.close();
    await sequelize.close();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (require.main === module) {
  start().catch((error) => {
    console.error('No se pudo iniciar order-service:', error);
    process.exitCode = 1;
  });
}

module.exports = { start };
