'use strict';

const crypto = require('crypto');

/**
 * Construye el sobre de evento (docs/eventos.md): igual para todos los
 * servicios. `event_id` es la llave de idempotencia de quien consume.
 *
 * @param {Object} params
 * @param {string} params.eventName
 * @param {number} [params.version]
 * @param {string} params.producer
 * @param {string} [params.correlationId]
 * @param {Object} params.payload
 * @returns {Object} sobre completo, listo para encolar en el outbox
 */
function buildEventEnvelope({ eventName, version = 1, producer, correlationId, payload }) {
  return {
    event_id: crypto.randomUUID(),
    event_name: eventName,
    version,
    occurred_at: new Date().toISOString(),
    correlation_id: correlationId || crypto.randomUUID(),
    producer,
    payload,
  };
}

module.exports = { buildEventEnvelope };
