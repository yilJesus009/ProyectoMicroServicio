'use strict';

const amqp = require('amqplib');

/**
 * Productor RabbitMQ (implementación del puerto IEventPublisher).
 *
 * Envelope de docs/eventos.md:
 *   { event_name, occurred_at, correlation_id, producer, payload }
 *
 * Reglas:
 *   - Exchange tipo "topic", durable; routing_key = nombre del evento.
 *   - Publicar es fire-and-forget: NUNCA lanza excepción hacia arriba
 *     (docs/eventos.md regla 3: un fallo del bus no bloquea al productor).
 *   - Conexión perezosa: el servicio arranca aunque RabbitMQ no esté listo.
 */
class RabbitMqEventPublisher {
  constructor({ url, producer }) {
    this.url = url;
    this.producer = producer;
    this.connection = null;
    this.channel = null;
    this.connecting = null;
  }

  async connect() {
    if (this.channel) return this.channel;
    if (!this.connecting) {
      this.connecting = (async () => {
        this.connection = await amqp.connect(this.url);
        this.channel = await this.connection.createChannel();
        this.connection.on('close', () => {
          this.connection = null;
          this.channel = null;
        });
        this.connection.on('error', () => {
          this.connection = null;
          this.channel = null;
        });
      })().finally(() => {
        this.connecting = null;
      });
    }
    await this.connecting;
    return this.channel;
  }

  async publish(topic, eventName, payload, correlationId) {
    try {
      const channel = await this.connect();
      await channel.assertExchange(topic, 'topic', { durable: true });

      const message = {
        event_name: eventName,
        occurred_at: new Date().toISOString(),
        correlation_id: correlationId || crypto.randomUUID(),
        producer: this.producer,
        payload,
      };

      channel.publish(topic, eventName, Buffer.from(JSON.stringify(message)), {
        persistent: true,
        contentType: 'application/json',
      });
    } catch (error) {
      // Fire-and-forget: se loguea y se continúa. La operación principal ya
      // tiene éxito aunque el bus esté caído.
      console.error(
        `[EventPublisher] no se pudo publicar ${eventName} en ${topic}:`,
        error.message
      );
    }
  }

  async close() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch {
      // El cierre es best-effort.
    } finally {
      this.channel = null;
      this.connection = null;
    }
  }
}

module.exports = { RabbitMqEventPublisher };
