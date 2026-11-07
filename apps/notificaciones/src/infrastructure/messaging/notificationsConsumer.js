'use strict';

const amqp = require('amqplib');

const QUEUE_NAME = 'notificaciones.all';
const DLX_EXCHANGE = 'dlx';
const DLQ_NAME = 'notificaciones.all.dlq';

/**
 * Deja creada la cola de este servicio al arrancar (docs/eventos.md): cada
 * consumidor tiene su propia cola, con su propia cola de errores (dlq)
 * colgada del dead-letter exchange `dlx`. Todavía SIN bindings a eventos
 * reales (fase 2 los agrega uno por evento: SUPPLIER_PROFILE_SUBMITTED,
 * SUPPLIER_APPROVED, ...): por ahora la cola existe, durable, y el
 * consumidor está prendido pero no le llega nada.
 *
 * Reintenta la conexión inicial: aunque `depends_on: rabbitmq healthy` en
 * docker-compose.yml evita la mayoría de las carreras, un solo intento
 * fallido dejaría la cola sin crear para siempre. 30 intentos x 3s (90s)
 * porque se observó en la práctica que el healthcheck de RabbitMQ puede
 * pasar unos segundos antes de que el puerto AMQP acepte conexiones de
 * verdad, sobre todo con la máquina bajo carga (varios builds a la vez).
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

async function startNotificationsConsumer({ url, onMessage }) {
  const connection = await connectWithRetry(url);
  const channel = await connection.createChannel();

  // Cola de errores (docs/eventos.md §4): recibe lo que nack sin reencolar.
  await channel.assertExchange(DLX_EXCHANGE, 'direct', { durable: true });
  await channel.assertQueue(DLQ_NAME, { durable: true });
  await channel.bindQueue(DLQ_NAME, DLX_EXCHANGE, DLQ_NAME);

  // Cola principal, con dead-lettering hacia `dlx`.
  await channel.assertQueue(QUEUE_NAME, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': DLX_EXCHANGE,
      'x-dead-letter-routing-key': DLQ_NAME,
    },
  });
  await channel.prefetch(1);

  await channel.consume(QUEUE_NAME, async (msg) => {
    if (!msg) return;
    try {
      const envelope = JSON.parse(msg.content.toString());
      await onMessage(envelope);
      channel.ack(msg);
    } catch (error) {
      console.error(`[notificaciones-consumer] error procesando mensaje:`, error.message);
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

module.exports = { startNotificationsConsumer, QUEUE_NAME, DLX_EXCHANGE, DLQ_NAME };
