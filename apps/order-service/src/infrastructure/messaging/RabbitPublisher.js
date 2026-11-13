'use strict';

const amqp = require('amqplib');

class RabbitPublisher {
  constructor({ host = process.env.RABBITMQ_HOST, port = process.env.RABBITMQ_PORT,
    user = process.env.RABBITMQ_USER, pass = process.env.RABBITMQ_PASS } = {}) {
    if (!host || !port || !user || !pass) throw new Error('La configuración de RabbitMQ está incompleta');
    this.url = `amqp://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}`;
    this.channel = null;
  }

  async connect() {
    if (this.channel) return;
    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createConfirmChannel();
    this.connection.on('error', (error) => console.error('RabbitMQ publisher error:', error.message));
    this.connection.on('close', () => { this.channel = null; });
  }

  async publish(topic, routingKey, message) {
    if (!this.channel) await this.connect();
    await this.channel.assertExchange(topic, 'topic', { durable: true });
    this.channel.publish(topic, routingKey, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      contentType: 'application/json',
      messageId: message.correlation_id,
      timestamp: Date.now(),
    });
    await this.channel.waitForConfirms();
  }

  async close() {
    await this.channel?.close().catch(() => {});
    await this.connection?.close().catch(() => {});
  }
}

module.exports = { RabbitPublisher };
