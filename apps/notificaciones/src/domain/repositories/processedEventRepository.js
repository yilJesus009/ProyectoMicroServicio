'use strict';

/**
 * Contrato del registro de eventos ya aplicados (idempotencia, docs/eventos.md).
 * Interfaz, NO implementación: vive en infrastructure/persistence/.
 */
class IProcessedEventRepository {
  /** @param {Object} [options] @param {unknown} [options.transaction] */
  async isProcessed(eventId, options = {}) {
    throw new Error('not implemented');
  }

  /** @param {Object} [options] @param {unknown} [options.transaction] */
  async markProcessed(eventId, eventName, options = {}) {
    throw new Error('not implemented');
  }
}

module.exports = { IProcessedEventRepository };
