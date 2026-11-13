'use strict';

const amqp = require('amqplib');
const { Topic } = require('@repuestos/shared');

const OFFER_ACCEPTED = 'OFFER_ACCEPTED';
const MAIN_QUEUE = 'order-service.order.created';
const RETRY_QUEUE = `${MAIN_QUEUE}.retry`;
const DEAD_QUEUE = `${MAIN_QUEUE}.dead`;
const RETRY_EXCHANGE = 'order_service_retry';
const DEAD_EXCHANGE = 'order_service_dead';

class OfferAcceptedConsumer {
  constructor({ handler, retryDelayMs = Number(process.env.ORDER_EVENT_RETRY_DELAY_MS || 5000),
    maxRetries = Number(process.env.ORDER_EVENT_MAX_RETRIES || 5) }) {
    this.handler = handler;
    this.retryDelayMs = retryDelayMs;
    this.maxRetries = maxRetries;
    const { RABBITMQ_USER, RABBITMQ_PASS, RABBITMQ_HOST, RABBITMQ_PORT } = process.env;
    if (!RABBITMQ_USER || !RABBITMQ_PASS || !RABBITMQ_HOST || !RABBITMQ_PORT) {
      throw new Error('La configuración de RabbitMQ está incompleta');
    }
    this.url = `amqp://${encodeURIComponent(RABBITMQ_USER)}:${encodeURIComponent(RABBITMQ_PASS)}@` +
      `${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
    this.stopping = false;
  }

  start() {
    this.stopping = false;
    void this.connect();
  }

  async connect() {
    if (this.stopping) return;
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createConfirmChannel();
      this.connection.on('error', (error) => console.error('RabbitMQ consumer error:', error.message));
      this.connection.on('close', () => {
        this.channel = null;
        if (!this.stopping) this.scheduleReconnect();
      });

      await this.channel.assertExchange(Topic.OFFER, 'topic', { durable: true });
      await this.channel.assertExchange(RETRY_EXCHANGE, 'direct', { durable: true });
      await this.channel.assertExchange(DEAD_EXCHANGE, 'direct', { durable: true });
      await this.channel.assertQueue(DEAD_QUEUE, { durable: true });
      await this.channel.bindQueue(DEAD_QUEUE, DEAD_EXCHANGE, OFFER_ACCEPTED);
      await this.channel.assertQueue(RETRY_QUEUE, {
        durable: true,
        messageTtl: this.retryDelayMs,
        deadLetterExchange: Topic.OFFER,
        deadLetterRoutingKey: OFFER_ACCEPTED,
      });
      await this.channel.bindQueue(RETRY_QUEUE, RETRY_EXCHANGE, OFFER_ACCEPTED);
      await this.channel.assertQueue(MAIN_QUEUE, {
        durable: true,
        deadLetterExchange: RETRY_EXCHANGE,
        deadLetterRoutingKey: OFFER_ACCEPTED,
      });
      await this.channel.bindQueue(MAIN_QUEUE, Topic.OFFER, OFFER_ACCEPTED);
      await this.channel.prefetch(1);
      await this.channel.consume(MAIN_QUEUE, (message) => this.handle(message), { noAck: false });
    } catch (error) {
      console.error('No se pudo conectar el consumidor de OFFER_ACCEPTED:', error.message);
      await this.connection?.close().catch(() => {});
      this.scheduleReconnect();
    }
  }

  retryCount(message) {
    const deaths = message.properties.headers?.['x-death'] || [];
    return deaths
      .filter((death) => death.queue === MAIN_QUEUE)
      .reduce((sum, death) => sum + Number(death.count || 0), 0);
  }

  async handle(message) {
    if (!message || !this.channel) return;
    try {
      const event = JSON.parse(message.content.toString('utf8'));
      await this.handler.execute(event);
      this.channel.ack(message);
    } catch (error) {
      console.error('No se pudo procesar OFFER_ACCEPTED:', error.message);
      if (this.retryCount(message) >= this.maxRetries) {
        try {
          this.channel.publish(DEAD_EXCHANGE, OFFER_ACCEPTED, message.content, {
            persistent: true,
            contentType: message.properties.contentType,
            headers: message.properties.headers,
          });
          await this.channel.waitForConfirms();
          this.channel.ack(message);
        } catch (publishError) {
          console.error('No se pudo enviar OFFER_ACCEPTED a la cola de errores:', publishError.message);
          this.channel.nack(message, false, false);
        }
      } else {
        this.channel.nack(message, false, false);
      }
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer || this.stopping) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, 3000);
    this.reconnectTimer.unref();
  }

  async stop() {
    this.stopping = true;
    clearTimeout(this.reconnectTimer);
    await this.channel?.close().catch(() => {});
    await this.connection?.close().catch(() => {});
  }
}

module.exports = { OfferAcceptedConsumer };
