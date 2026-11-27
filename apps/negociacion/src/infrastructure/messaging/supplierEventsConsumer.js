'use strict';

const amqp = require('amqplib');
const { SupplierEvent } = require('../../application/contracts');

const EXCHANGE = 'identity_events';
const QUEUE_NAME = 'negociacion.supplier_events';
const DLX_EXCHANGE = 'dlx';
const DLQ_NAME = 'negociacion.supplier_events.dlq';

const BOUND_EVENTS = [SupplierEvent.PROFILE_SUBMITTED, SupplierEvent.APPROVED, SupplierEvent.REJECTED];

/**
 * Cola propia para la copia local de proveedores (docs/eventos.md), con la
 * convención exacta de dlx/.dlq: igual patrón que
 * notificacionesConsumer.js (fase 1), que ya resolvió el reintento de
 * conexión inicial contra RabbitMQ.
 */
async function connectWithRetry(url, retries = 30, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await amqp.connect(url);
    } catch (error) {
      if (attempt === retries) throw error;
      console.error(
        `[negociacion-consumer] intento ${attempt}/${retries} fallido (${error.message}), reintentando en ${delayMs}ms...`
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
 * @param {import('../../application/commands/applySupplierEvent').ApplySupplierEvent} applySupplierEvent
 * @returns {Promise<{action: 'ack'|'nack', reason?: string}>}
 */
async function handleRawMessage(rawContent, applySupplierEvent) {
  let envelope;
  try {
    envelope = JSON.parse(rawContent.toString());
  } catch (error) {
    return { action: 'nack', reason: `mensaje no es JSON válido: ${error.message}` };
  }

  // Instrucción del equipo (2026-11-09): sin event_id no se procesa, va
  // directo a la dlq sin tocar la lógica de aplicación.
  if (!envelope.event_id) {
    return { action: 'nack', reason: `evento sin event_id (${envelope.event_name})` };
  }

  try {
    await applySupplierEvent.execute(envelope);
    return { action: 'ack' };
  } catch (error) {
    return { action: 'nack', reason: `${envelope.event_name} (${envelope.event_id}): ${error.message}` };
  }
}

/**
 * @param {Object} deps
 * @param {string} deps.url URL de conexión AMQP
 * @param {import('../../application/commands/applySupplierEvent').ApplySupplierEvent} deps.applySupplierEvent
 */
async function startSupplierEventsConsumer({ url, applySupplierEvent }) {
  const connection = await connectWithRetry(url);
  const channel = await connection.createChannel();

  // Cola de errores: recibe lo que nack sin reencolar.
  await channel.assertExchange(DLX_EXCHANGE, 'direct', { durable: true });
  await channel.assertQueue(DLQ_NAME, { durable: true });
  await channel.bindQueue(DLQ_NAME, DLX_EXCHANGE, DLQ_NAME);

  // Exchange de Identidad (topic, durable) — declarado también acá por si
  // este consumidor arranca antes que Identidad; assertExchange es idempotente.
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

  // Cola principal, con dead-lettering hacia `dlx`.
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

    const { action, reason } = await handleRawMessage(msg.content, applySupplierEvent);
    if (action === 'ack') {
      channel.ack(msg);
    } else {
      console.error(`[negociacion-consumer] ${reason} — descartado a ${DLQ_NAME}`);
      channel.nack(msg, false, false); // sin reencolar: va a negociacion.supplier_events.dlq
    }
  });

  return {
    async close() {
      await channel.close();
      await connection.close();
    },
  };
}

module.exports = { startSupplierEventsConsumer, handleRawMessage, QUEUE_NAME, DLX_EXCHANGE, DLQ_NAME };
