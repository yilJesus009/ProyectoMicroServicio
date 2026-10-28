'use strict';

/**
 * Nombres de eventos y topics.
 *
 * Fuente de verdad para la mensajería. Ver docs/eventos.md.
 *
 * Convención:
 *   - Eventos  en MAYUSCULAS_SNAKE_CASE  (OFFER_ACCEPTED)
 *   - Topics   en minusculas_snake_case  (offer_events)
 */

/** Topics: agrupan los eventos de un agregado. */
const Topic = Object.freeze({
  IDENTITY:        'identity_events',
  PART_REQUEST:    'part_request_events',
  OFFER:           'offer_events',
  ORDER:           'order_events',
  CATALOG:         'catalog_events',
  NOTIFICATION:    'notification_events',
});

/** Eventos de identidad. Productor: identity-service. */
const IdentityEvent = Object.freeze({
  USER_CREATED:      'USER_CREATED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
});

/** Eventos de solicitudes. Productor: part-request-service. */
const PartRequestEvent = Object.freeze({
  PART_REQUEST_CREATED:        'PART_REQUEST_CREATED',
  PART_REQUEST_STATUS_CHANGED: 'PART_REQUEST_STATUS_CHANGED',
});

/**
 * Eventos de ofertas. Productor: offer-service.
 *
 * OFFER_ACCEPTED es el evento más importante del proyecto: es el que
 * dispara la creación del pedido en order-service.
 */
const OfferEvent = Object.freeze({
  OFFER_SUBMITTED: 'OFFER_SUBMITTED',
  OFFER_ACCEPTED:  'OFFER_ACCEPTED',
  OFFER_REJECTED:  'OFFER_REJECTED',
});

/** Eventos de pedidos. Productor: order-service. */
const OrderEvent = Object.freeze({
  ORDER_CREATED:        'ORDER_CREATED',
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
});

/** Eventos de catálogo. Productor: catalog-vehicle-service. */
const CatalogEvent = Object.freeze({
  VEHICLE_REGISTERED: 'VEHICLE_REGISTERED',
});

/** Eventos de notificación. Productor: notification-service. */
const NotificationEvent = Object.freeze({
  NOTIFICATION_SENT: 'NOTIFICATION_SENT',
});

/**
 * Construye el envelope estándar de un evento.
 *
 * @param {Object} params
 * @param {string} params.eventName       Nombre del evento (OFFER_ACCEPTED)
 * @param {string} params.producer        Servicio que lo emite
 * @param {Object} params.payload         Datos del hecho
 * @param {string} [params.correlationId] Id que traza la operación completa
 * @returns {Object} Mensaje listo para serializar
 */
function buildEvent({ eventName, producer, payload, correlationId }) {
  return {
    event_name:     eventName,
    occurred_at:    new Date().toISOString(),   // cuándo PASÓ, no cuándo se consumió
    correlation_id: correlationId || newId(),
    producer,
    payload,
  };
}

/**
 * Genera un identificador único para correlation_id.
 * Sin dependencias externas.
 * @returns {string}
 */
function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

module.exports = {
  Topic,
  IdentityEvent,
  PartRequestEvent,
  OfferEvent,
  OrderEvent,
  CatalogEvent,
  NotificationEvent,
  buildEvent,
  newId,
};
