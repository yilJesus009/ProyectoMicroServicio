'use strict';

const amqp = require('amqplib');
const { EVENT_EXCHANGE, Exchange } = require('../../application/contracts');

const QUEUE_NAME = 'notificaciones.all';
const DLX_EXCHANGE = 'dlx';
const DLQ_NAME = 'notificaciones.all.dlq';

/**
 * Cola única de este servicio (docs/eventos.md), con bindings a los 7
 * eventos de Identidad y Negociación que generan avisos (fase 2, bloque A3).
 *
 * Reintenta la conexión inicial (ver fase 1): 30 intentos x 3 s.
 */
async function connectWithRetry(url, retries = 30, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await amqp.connect(url);
    } catch (error) {
      if (attempt === retries) throw error;
      console.error(
        `[notificaciones-consumer] intento ${attempt}/${retries} fallido (${error.message}), reintentando en ${delayMs}ms...`
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
 * @param {import('../../application/commands/applyNegotiationEvent').ApplyNegotiationEvent} applyNegotiationEvent
 * @returns {Promise<{action: 'ack'|'nack', reason?: string}>}
 */
async function handleRawMessage(rawContent, applyNegotiationEvent) {
  let envelope;
  try {
    envelope = JSON.parse(rawContent.toString());
  } catch (error) {
    return { action: 'nack', reason: `mensaje no es JSON válido: ${error.message}` };
  }

  // Sin event_id no se procesa: va directo a la dlq (igual que en Negociación).
  if (!envelope.event_id) {
    return { action: 'nack', reason: `evento sin event_id (${envelope.event_name})` };
  }

  try {
    await applyNegotiationEvent.execute(envelope);
    return { action: 'ack' };
  } catch (error) {
    return { action: 'nack', reason: `${envelope.event_name} (${envelope.event_id}): ${error.message}` };
  }
}

/**
 * @param {Object} deps
 * @param {string} deps.url URL de conexión AMQP
 * @param {import('../../application/commands/applyNegotiationEvent').ApplyNegotiationEvent} deps.applyNegotiationEvent
 */
async function startNotificationsConsumer({ url, applyNegotiationEvent }) {
  const connection = await connectWithRetry(url);
  const channel = await connection.createChannel();

  // Cola de errores (docs/eventos.md §4): recibe lo que nack sin reencolar.
  await channel.assertExchange(DLX_EXCHANGE, 'direct', { durable: true });
  await channel.assertQueue(DLQ_NAME, { durable: true });
  await channel.bindQueue(DLQ_NAME, DLX_EXCHANGE, DLQ_NAME);

  // Los 3 exchanges de los que consume (declarados también acá, idempotente,
  // por si este servicio arranca antes que Identidad o Negociación).
  for (const exchange of Object.values(Exchange)) {
    await channel.assertExchange(exchange, 'topic', { durable: true });
  }

  // Cola principal, con dead-lettering hacia `dlx`.
  await channel.assertQueue(QUEUE_NAME, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': DLX_EXCHANGE,
      'x-dead-letter-routing-key': DLQ_NAME,
    },
  });
  for (const [routingKey, exchange] of Object.entries(EVENT_EXCHANGE)) {
    await channel.bindQueue(QUEUE_NAME, exchange, routingKey);
  }
  await channel.prefetch(1);

  await channel.consume(QUEUE_NAME, async (msg) => {
    if (!msg) return;

    const { action, reason } = await handleRawMessage(msg.content, applyNegotiationEvent);
    if (action === 'ack') {
      channel.ack(msg);
    } else {
      console.error(`[notificaciones-consumer] ${reason} — descartado a ${DLQ_NAME}`);
      channel.nack(msg, false, false); // sin reencolar: va a notificaciones.all.dlq
    }
  });

  return {
    async close() {
      await channel.close();
      await connection.close();
    },
  };
}

module.exports = { startNotificationsConsumer, handleRawMessage, QUEUE_NAME, DLX_EXCHANGE, DLQ_NAME };
