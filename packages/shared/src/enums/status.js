'use strict';

/**
 * Estados de dominio compartidos entre servicios.
 *
 * Son la fuente de verdad. Si un servicio usa un estado que no está aquí,
 * primero se agrega en este archivo y se documenta en docs/.
 */

/**
 * Estados de una solicitud de repuesto (Part Request).
 * Dueño: part-request-service.
 */
const PartRequestStatus = Object.freeze({
  PUBLISHED: 'PUBLISHED',   // Visible para proveedores. Acepta ofertas.
  ORDERED:   'ORDERED',     // Ya tiene oferta aceptada y pedido generado.
  COMPLETED: 'COMPLETED',   // El pedido se finalizó.
  CANCELLED: 'CANCELLED',   // Cancelada antes de aceptar una oferta.
});

/**
 * Nivel de urgencia de una solicitud.
 *
 * Valores según docs/contratos-api.md (BAJA | MEDIA | ALTA).
 * Antes decía LOW/MEDIUM/HIGH: se unificó al español porque el contrato y
 * los payloads de eventos usan BAJA/MEDIA/ALTA.
 * Pendiente de confirmación en la primera reunión técnica del equipo.
 */
const Urgency = Object.freeze({
  BAJA:  'BAJA',
  MEDIA: 'MEDIA',
  ALTA:  'ALTA',
});

/**
 * Transiciones legales de una solicitud de repuesto.
 * Dueño: part-request-service.
 *
 * Clave: estado actual. Valor: estados a los que se puede avanzar.
 * COMPLETED y CANCELLED son terminales. Una transición no listada → 422.
 */
const PART_REQUEST_TRANSITIONS = Object.freeze({
  [PartRequestStatus.PUBLISHED]: [PartRequestStatus.ORDERED, PartRequestStatus.CANCELLED],
  [PartRequestStatus.ORDERED]:   [PartRequestStatus.COMPLETED],
  [PartRequestStatus.COMPLETED]: [],
  [PartRequestStatus.CANCELLED]: [],
});

/**
 * Determina si una transición de estado de una solicitud es legal.
 *
 * @param {string} from Estado actual
 * @param {string} to   Estado deseado
 * @returns {boolean}
 */
function canPartRequestTransition(from, to) {
  const allowed = PART_REQUEST_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * Estados de una oferta.
 * Dueño: offer-service.
 *
 * IMPORTANTE: solo puede existir UNA oferta en ACCEPTED por solicitud.
 * Regla garantizada con un índice UNIQUE parcial en la base de datos.
 */
const OfferStatus = Object.freeze({
  SUBMITTED: 'SUBMITTED',   // Enviada, pendiente de decisión.
  ACCEPTED:  'ACCEPTED',    // La elegida. Genera el pedido. Una sola por solicitud.
  REJECTED:  'REJECTED',    // No seleccionada. Queda en el historial.
});

/**
 * Condición del repuesto ofrecido.
 */
const PartCondition = Object.freeze({
  NEW:         'NEW',
  USED:        'USED',
  REFURBISHED: 'REFURBISHED',
});

/**
 * Disponibilidad del repuesto.
 */
const Availability = Object.freeze({
  IN_STOCK:      'IN_STOCK',
  ORDER_REQUIRED: 'ORDER_REQUIRED',
});

/**
 * Forma de entrega.
 */
const DeliveryType = Object.freeze({
  PICKUP:   'PICKUP',     // El solicitante retira.
  DELIVERY: 'DELIVERY',   // El proveedor entrega.
});

/**
 * Estados del pedido (Order) y sus transiciones legales.
 * Dueño: order-service.
 *
 * Una transición no listada devuelve HTTP 422.
 */
const OrderStatus = Object.freeze({
  PENDING:   'PENDING',     // Creado a partir de OFFER_ACCEPTED.
  PREPARING: 'PREPARING',   // El proveedor lo está preparando.
  SHIPPED:   'SHIPPED',     // En camino.
  DELIVERED: 'DELIVERED',   // Llegó al solicitante.
  COMPLETED: 'COMPLETED',   // El solicitante confirmó la recepción.
  CANCELLED: 'CANCELLED',   // Cancelado por cualquiera, antes de SHIPPED.
});

/**
 * Transiciones permitidas del pedido.
 * Clave: estado actual. Valor: estados a los que se puede avanzar.
 */
const ORDER_TRANSITIONS = Object.freeze({
  [OrderStatus.PENDING]:   [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.SHIPPED,   OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]:   [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
});

/**
 * Determina si una transición de estado del pedido es legal.
 *
 * @param {string} from  Estado actual
 * @param {string} to    Estado deseado
 * @returns {boolean}
 */
function canTransition(from, to) {
  const allowed = ORDER_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

module.exports = {
  PartRequestStatus,
  PART_REQUEST_TRANSITIONS,
  canPartRequestTransition,
  Urgency,
  OfferStatus,
  PartCondition,
  Availability,
  DeliveryType,
  OrderStatus,
  ORDER_TRANSITIONS,
  canTransition,
};
