'use strict';

/**
 * Exchanges y eventos que consume este servicio (docs/eventos.md).
 * Fuente de verdad para la cola `notificaciones.all` y sus bindings.
 */

const Exchange = Object.freeze({
  IDENTITY: 'identity_events',
  PART_REQUEST: 'part_request_events',
  OFFER: 'offer_events',
  ORDER: 'order_events',
});

/** routing_key → exchange del que viene (para los bindings de la cola). */
const EVENT_EXCHANGE = Object.freeze({
  SUPPLIER_PROFILE_SUBMITTED: Exchange.IDENTITY,
  SUPPLIER_APPROVED: Exchange.IDENTITY,
  SUPPLIER_REJECTED: Exchange.IDENTITY,
  PART_REQUEST_CREATED: Exchange.PART_REQUEST,
  OFFER_SUBMITTED: Exchange.OFFER,
  OFFER_ACCEPTED: Exchange.OFFER,
  OFFER_REJECTED: Exchange.OFFER,
  ORDER_CREATED: Exchange.ORDER,
  ORDER_STATUS_CHANGED: Exchange.ORDER,
});

module.exports = { Exchange, EVENT_EXCHANGE };
