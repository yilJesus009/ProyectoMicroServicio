'use strict';

/**
 * Contrato del repositorio del outbox (docs/eventos.md).
 *
 * Interfaz, NO implementación: el caso de uso no sabe que hay Sequelize ni
 * RabbitMQ detrás. La implementación vive en infrastructure/persistence/.
 */
class IOutboxRepository {
  /**
   * Encola un evento para publicar después. Debe llamarse con el mismo
   * `transaction` que el cambio de negocio: si la transacción se revierte,
   * el evento tampoco queda guardado.
   *
   * @param {Object} envelope Sobre completo (event_id, event_name, version,
   *   occurred_at, correlation_id, producer, payload) — docs/eventos.md
   * @param {Object} options
   * @param {string} options.exchange
   * @param {string} options.routingKey
   * @param {unknown} [options.transaction]
   * @returns {Promise<void>}
   */
  async enqueue(envelope, { exchange, routingKey, transaction } = {}) {
    throw new Error('not implemented');
  }

  /**
   * Eventos pendientes (published_at IS NULL), en orden de creación.
   * @param {number} limit
   * @returns {Promise<Array<{id: string, exchange: string, routingKey: string, payload: Object}>>}
   */
  async findUnpublished(limit) {
    throw new Error('not implemented');
  }

  /** Marca un evento como publicado. */
  async markPublished(id) {
    throw new Error('not implemented');
  }

  /** Suma un intento fallido de publicación (para diagnóstico/backoff). */
  async incrementAttempts(id) {
    throw new Error('not implemented');
  }
}

module.exports = { IOutboxRepository };
