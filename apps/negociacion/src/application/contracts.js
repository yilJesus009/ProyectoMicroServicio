'use strict';

/**
 * Nombres de topics y eventos con los que habla este servicio.
 *
 * Espejo de `packages/shared/src/events/index.js` (misma razón que los enums:
 * workspaces de npm aún sin configurar). Fuente de verdad: docs/eventos.md.
 */

const Topic = Object.freeze({
  IDENTITY: 'identity_events',
  PART_REQUEST: 'part_request_events',
  OFFER: 'offer_events',
  ORDER: 'order_events',
  CATALOG: 'catalog_events',
  NOTIFICATION: 'notification_events',
});

const PartRequestEvent = Object.freeze({
  CREATED: 'PART_REQUEST_CREATED',
  STATUS_CHANGED: 'PART_REQUEST_STATUS_CHANGED',
});

/**
 * Estados que este servicio NO acepta desde una petición HTTP: los asigna
 * un consumidor de eventos.
 *
 *   ORDERED ← OFFER_ACCEPTED (docs/arquitectura.md §3.4)
 *
 * El dueño no puede declarar por su cuenta que ya tiene oferta aceptada:
 * lo dice quien acepta la oferta. Quien lo pida por PATCH recibe 422.
 */
const EVENT_DRIVEN_STATUS = Object.freeze({
  ORDERED: 'OFFER_ACCEPTED',
});

module.exports = { Topic, PartRequestEvent, EVENT_DRIVEN_STATUS };
