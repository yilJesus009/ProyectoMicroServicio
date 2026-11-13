'use strict';

require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const { sequelize } = require('./infrastructure/config/database');
const { OfferRepository } = require('./infrastructure/persistence/OfferRepository');
const { OutboxRepository } = require('./infrastructure/persistence/OutboxRepository');
const { PartRequestHttpClient } = require('./infrastructure/http/PartRequestHttpClient');
const { RabbitPublisher } = require('./infrastructure/messaging/RabbitPublisher');
const { OutboxDispatcher } = require('./infrastructure/messaging/OutboxDispatcher');
const { CreateOffer } = require('./application/commands/CreateOffer');
const { AcceptOffer } = require('./application/commands/AcceptOffer');
const { GetOffers } = require('./application/queries/GetOffers');
const { createApp } = require('./presentation/http/createApp');

async function start() {
  const required = [
    'JWT_SECRET', 'OFFER_PORT', 'DB_OFFER_NAME', 'DB_OFFER_USER',
    'DB_OFFER_PASSWORD', 'DB_OFFER_HOST', 'DB_OFFER_PORT',
    'RABBITMQ_HOST', 'RABBITMQ_PORT', 'RABBITMQ_USER', 'RABBITMQ_PASS',
    'PART_REQUEST_SERVICE_URL',
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

  const offerRepository = new OfferRepository();
  const outboxRepository = new OutboxRepository();
  const requestClient = new PartRequestHttpClient();
  const publisher = new RabbitPublisher();
  try {
    await publisher.connect();
  } catch (error) {
    console.error('RabbitMQ no está disponible; los eventos quedarán en el outbox:', error.message);
  }

  const dispatcher = new OutboxDispatcher({ repository: outboxRepository, publisher });
  dispatcher.start();
  const app = createApp({
    createOffer: new CreateOffer({ offerRepository, requestClient, outboxRepository }),
    acceptOffer: new AcceptOffer({ offerRepository, requestClient, outboxRepository }),
    getOffers: new GetOffers({ offerRepository, requestClient }),
  });
  const server = app.listen(Number(process.env.OFFER_PORT), () => {
    console.log(`offer-service escuchando en el puerto ${process.env.OFFER_PORT}`);
  });

  const shutdown = async () => {
    dispatcher.stop();
    server.close();
    await publisher.close();
    await sequelize.close();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (require.main === module) {
  start().catch((error) => {
    console.error('No se pudo iniciar offer-service:', error);
    process.exitCode = 1;
  });
}

module.exports = { start };
