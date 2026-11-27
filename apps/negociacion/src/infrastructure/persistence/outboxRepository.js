'use strict';

const { IOutboxRepository } = require('../../domain/repositories/outboxRepository');

/**
 * Implementación Sequelize del contrato IOutboxRepository.
 *
 * Es el único archivo que sabe que `outbox_events` es una tabla Postgres.
 */
class SequelizeOutboxRepository extends IOutboxRepository {
  constructor(outboxEventModel) {
    super();
    this.model = outboxEventModel;
  }

  async enqueue(envelope, { exchange, routingKey, transaction } = {}) {
    await this.model.create(
      { id: envelope.event_id, exchange, routingKey, payload: envelope },
      { transaction }
    );
  }

  /** En orden de creación: el worker publica en ese mismo orden. */
  async findUnpublished(limit = 20) {
    const rows = await this.model.findAll({
      where: { publishedAt: null },
      order: [['createdAt', 'ASC']],
      limit,
    });
    return rows.map((row) => ({
      id: row.id,
      exchange: row.exchange,
      routingKey: row.routingKey,
      payload: row.payload,
    }));
  }

  async markPublished(id) {
    await this.model.update({ publishedAt: new Date() }, { where: { id } });
  }

  async incrementAttempts(id) {
    await this.model.increment('attempts', { where: { id } });
  }
}

module.exports = { SequelizeOutboxRepository };
