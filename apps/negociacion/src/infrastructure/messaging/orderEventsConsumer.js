'use strict';

const amqp = require('amqplib');
const { OrderEvent } = require('../../application/contracts');

const EXCHANGE = 'order_events';
const QUEUE_NAME = 'negociacion.order_status_changed';
const DLX_EXCHANGE = 'dlx';
const DLQ_NAME = 'negociacion.order_status_changed.dlq';

const BOUND_EVENTS = [OrderEvent.STATUS_CHANGED];

/**
 * Cola propia para el cierre de la solicitud (docs/eventos.md, fase 3
 * bloque A2), con la convención exacta de dlx/.dlq — mismo patrón que
 * supplierEventsConsumer.js. Solo bindea ORDER_STATUS_CHANGED: ORDER_CREATED
 * es solo para Notificaciones.
 */
async function connectWithRetry(url, retries = 30, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await amqp.connect(url);
    } catch (error) {
      if (attempt === retries) throw error;
      console.error(
        `[negociacion-order-consumer] intento ${attempt}/${retries} fallido (${error.message}), reintentando en ${delayMs}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Decide qué hacer con un mensaje crudo, sin tocar amqplib: facilita
 * probar la regla "sin event_id no se procesa" sin un broker real.
 *
 * @param {Buffer|string} rawContent `msg.content`
 * @param {import('../../application/commands/applyOrderStatusChanged').ApplyOrderStatusChanged} applyOrderStatusChanged
 * @returns {Promise<{action: 'ack'|'nack', reason?: string}>}
 */
async function handleRawMessage(rawContent, applyOrderStatusChanged) {
  let envelope;
  try {
    envelope = JSON.parse(rawContent.toString());
  } catch (error) {
    return { action: 'nack', reason: `mensaje no es JSON válido: ${error.message}` };
  }

  if (!envelope.event_id) {
    return { action: 'nack', reason: `evento sin event_id (${envelope.event_name})` };
  }

  try {
    await applyOrderStatusChanged.execute(envelope);
    return { action: 'ack' };
  } catch (error) {
    return { action: 'nack', reason: `${envelope.event_name} (${envelope.event_id}): ${error.message}` };
  }
}

/**
 * @param {Object} deps
 * @param {string} deps.url URL de conexión AMQP
 * @param {import('../../application/commands/applyOrderStatusChanged').ApplyOrderStatusChanged} deps.applyOrderStatusChanged
 */
async function startOrderEventsConsumer({ url, applyOrderStatusChanged }) {
  const connection = await connectWithRetry(url);
  const channel = await connection.createChannel();

  await channel.assertExchange(DLX_EXCHANGE, 'direct', { durable: true });
  await channel.assertQueue(DLQ_NAME, { durable: true });
  await channel.bindQueue(DLQ_NAME, DLX_EXCHANGE, DLQ_NAME);

  // Exchange de Pedidos (topic, durable) — declarado también acá por si
  // este consumidor arranca antes que Pedidos; assertExchange es idempotente.
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

  await channel.assertQueue(QUEUE_NAME, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': DLX_EXCHANGE,
      'x-dead-letter-routing-key': DLQ_NAME,
    },
  });
  for (const routingKey of BOUND_EVENTS) {
    await channel.bindQueue(QUEUE_NAME, EXCHANGE, routingKey);
  }
  await channel.prefetch(1);

  await channel.consume(QUEUE_NAME, async (msg) => {
    if (!msg) return;

    const { action, reason } = await handleRawMessage(msg.content, applyOrderStatusChanged);
    if (action === 'ack') {
      channel.ack(msg);
    } else {
      console.error(`[negociacion-order-consumer] ${reason} — descartado a ${DLQ_NAME}`);
      channel.nack(msg, false, false); // sin reencolar: va a negociacion.order_status_changed.dlq
    }
  });

  return {
    async close() {
      await channel.close();
      await connection.close();
    },
  };
}

module.exports = { startOrderEventsConsumer, handleRawMessage, QUEUE_NAME, DLX_EXCHANGE, DLQ_NAME };
