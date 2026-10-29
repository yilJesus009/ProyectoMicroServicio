'use strict';

/**
 * Puerto hacia el bus de eventos.
 *
 * Interfaz: el caso de uso no sabe si hay RabbitMQ detrás.
 * Implementación: infrastructure/messaging/rabbitMqEventPublisher.js
 */
class IEventPublisher {
  /**
   * @param {string} topic Ej. part_request_events
   * @param {string} eventName Ej. PART_REQUEST_CREATED
   * @param {Object} payload Datos del hecho (docs/eventos.md)
   * @param {string} [correlationId] Id de trazabilidad de la operación
   * @returns {Promise<void>}
   */
  async publish(topic, eventName, payload, correlationId) {
    throw new Error('not implemented');
  }
}

module.exports = { IEventPublisher };
