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

/** Eventos de Identidad que consume la copia local de proveedores (docs/eventos.md). */
const SupplierEvent = Object.freeze({
  PROFILE_SUBMITTED: 'SUPPLIER_PROFILE_SUBMITTED',
  APPROVED: 'SUPPLIER_APPROVED',
  REJECTED: 'SUPPLIER_REJECTED',
});

const OfferEvent = Object.freeze({
  SUBMITTED: 'OFFER_SUBMITTED',
  ACCEPTED: 'OFFER_ACCEPTED',
  REJECTED: 'OFFER_REJECTED',
});

/** Eventos de Pedidos que consume el cierre de la solicitud (docs/eventos.md). */
const OrderEvent = Object.freeze({
  STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
});

/**
 * Estados que este servicio NO acepta desde una petición HTTP (PATCH
 * .../status): los asigna un caso de uso interno o un consumidor de
 * eventos. docs/flujo-principal.md: "el comprador nunca puede poner
 * OFFER_ACCEPTED ni COMPLETED a mano".
 *
 *   RECEIVING_OFFERS ← se asigna al enviar la primera oferta (fase 2)
 *   OFFER_ACCEPTED   ← se asigna al aceptar una oferta (fase 2)
 *   COMPLETED        ← consumidor de ORDER_STATUS_CHANGED (Pedidos)
 *
 * El valor es el nombre del evento asociado, para el mensaje de error.
 */
const EVENT_DRIVEN_STATUS = Object.freeze({
  RECEIVING_OFFERS: 'OFFER_SUBMITTED',
  OFFER_ACCEPTED: 'OFFER_ACCEPTED',
  COMPLETED: 'ORDER_STATUS_CHANGED',
});

module.exports = { Topic, PartRequestEvent, SupplierEvent, OfferEvent, OrderEvent, EVENT_DRIVEN_STATUS };
