'use strict';

/**
 * Publicación fire-and-forget (docs/eventos.md regla 3).
 *
 * "Nunca bloquear al productor": la operación principal ya está persistida
 * antes de llegar aquí, así que el broker NO debe alargar la respuesta HTTP.
 * Por eso este helper:
 *   - NO hace `await`: lanza el evento y sigue.
 *   - Traga el error y lo loguea (el dato ya quedó guardado).
 *   - Acepta tanto una promesa como un lanzamiento síncrono.
 *
 * Si un día se necesita garantía de entrega, se usa outbox; mientras tanto
 * esto cubre la regla sin frenar al usuario.
 *
 * @param {Object} publisher Puerto eventPublisher (application/ports)
 * @param {string} label Etiqueta para el log (nombre del caso de uso)
 * @param {string} topic
 * @param {string} eventName
 * @param {Object} payload
 * @param {string} [correlationId]
 */
function publishFireAndForget(publisher, label, topic, eventName, payload, correlationId) {
  try {
    const pending = publisher.publish(topic, eventName, payload, correlationId);
    if (pending && typeof pending.catch === 'function') {
      pending.catch((error) => {
        console.error(`[${label}] no se pudo publicar ${eventName}:`, error.message);
      });
    }
  } catch (error) {
    console.error(`[${label}] no se pudo publicar ${eventName}:`, error.message);
  }
}

module.exports = { publishFireAndForget };
