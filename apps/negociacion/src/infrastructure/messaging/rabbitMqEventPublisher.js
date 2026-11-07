'use strict';

const amqp = require('amqplib');

/**
 * Productor RabbitMQ para el worker del outbox (infrastructure/messaging/
 * outboxPublisherWorker.js). A diferencia del publish directo que tenía
 * este servicio antes, `publishConfirmed` SÍ propaga el error: el worker
 * necesita saberlo para decidir si marca `published_at` o reintenta.
 *
 * Reglas (docs/eventos.md):
 *   - Exchange tipo "topic", durable: sobrevive a un reinicio de RabbitMQ.
 *   - Mensaje persistente (`persistent: true`): se guarda en disco.
 *   - Confirmación del broker: se espera el ack antes de considerar
 *     publicado el evento.
 */
class RabbitMqEventPublisher {
  constructor({ url }) {
    this.url = url;
    this.connection = null;
    this.channel = null;
    this.connecting = null;
  }

  async connect() {
    if (this.channel) return this.channel;
    if (!this.connecting) {
      this.connecting = (async () => {
        this.connection = await amqp.connect(this.url);
        this.channel = await this.connection.createConfirmChannel();
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

  /**
   * Publica con confirmación del broker. Resuelve cuando RabbitMQ confirma
   * la persistencia del mensaje; rechaza si el broker lo rechaza o la
   * conexión falla. NO traga el error: eso lo decide quien llama.
   *
   * @param {string} exchange
   * @param {string} routingKey
   * @param {Object} envelope Sobre completo (docs/eventos.md)
   */
  async publishConfirmed(exchange, routingKey, envelope) {
    const channel = await this.connect();
    await channel.assertExchange(exchange, 'topic', { durable: true });

    return new Promise((resolve, reject) => {
      channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(envelope)),
        { persistent: true, contentType: 'application/json' },
        (err) => (err ? reject(err) : resolve())
      );
    });
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
