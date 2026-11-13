'use strict';

require('dotenv').config();
const amqp = require('amqplib');
const { Topic } = require('@repuestos/shared');

const queue = 'order-service.order.created.dead';
const routingKey = 'OFFER_ACCEPTED';
const { RABBITMQ_USER, RABBITMQ_PASS, RABBITMQ_HOST, RABBITMQ_PORT } = process.env;

async function replay() {
  if (!RABBITMQ_USER || !RABBITMQ_PASS || !RABBITMQ_HOST || !RABBITMQ_PORT) {
    throw new Error('La configuración de RabbitMQ está incompleta');
  }
  const url = `amqp://${encodeURIComponent(RABBITMQ_USER)}:${encodeURIComponent(RABBITMQ_PASS)}@` +
    `${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
  const connection = await amqp.connect(url);
  const channel = await connection.createConfirmChannel();
  try {
    await channel.assertExchange(Topic.OFFER, 'topic', { durable: true });
    await channel.assertQueue(queue, { durable: true });
    let replayed = 0;
    for (;;) {
      const message = await channel.get(queue, { noAck: false });
      if (!message) break;
      const headers = { ...(message.properties.headers || {}) };
      delete headers['x-death'];
      delete headers['x-first-death-exchange'];
      delete headers['x-first-death-queue'];
      delete headers['x-first-death-reason'];
      channel.publish(Topic.OFFER, routingKey, message.content, {
        persistent: true,
        contentType: message.properties.contentType || 'application/json',
        messageId: message.properties.messageId,
        correlationId: message.properties.correlationId,
        headers,
      });
      await channel.waitForConfirms();
      channel.ack(message);
      replayed += 1;
    }
    console.log(`Eventos reenviados a OFFER_ACCEPTED: ${replayed}`);
  } finally {
    await channel.close();
    await connection.close();
  }
}

replay().catch((error) => {
  console.error('No se pudieron reenviar los eventos de la DLQ:', error.message);
  process.exitCode = 1;
});
