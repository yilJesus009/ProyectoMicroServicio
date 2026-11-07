'use strict';

/**
 * Estados de dominio compartidos entre servicios.
 *
 * Son la fuente de verdad. Si un servicio usa un estado que no está aquí,
 * primero se agrega en este archivo y se documenta en docs/.
 *
 * FUENTE: docs/flujo-principal.md (sección "Estados") y docs/modelo-datos.md.
 *
 * NOTA: hoy ningún servicio importa este paquete todavía (los workspaces de
 * npm no están configurados y la imagen de Docker solo copia el servicio).
 * Cada servicio mantiene un espejo local: ver
 * apps/negociacion/src/domain/enums/index.js. Cuando se activen los
 * workspaces, esos espejos pasan a re-exportar desde aquí.
 */

/**
 * Estados de una solicitud de repuesto.
 * Dueño: negociacion.
 */
const PartRequestStatus = Object.freeze({
  PUBLISHED: 'PUBLISHED',       // Visible para proveedores. Todavía sin ofertas.
  // Lo asigna el caso de uso de enviar la PRIMERA oferta, no el cliente:
  // un PATCH con este estado responde 422.
  RECEIVING_OFFERS: 'RECEIVING_OFFERS',
  // Lo asigna el caso de uso de ACEPTAR una oferta, no el cliente.
  // El comprador nunca puede ponerlo a mano.
  OFFER_ACCEPTED: 'OFFER_ACCEPTED',
  // Lo asigna el consumidor de ORDER_STATUS_CHANGED = COMPLETED (Pedidos).
  COMPLETED: 'COMPLETED',       // Terminal.
  CANCELLED: 'CANCELLED',       // El dueño cancela antes de aceptar una oferta.
});

/**
 * Nivel de urgencia de una solicitud.
 *
 * Valores según docs/contratos-api.md y docs/modelo-datos.md
 * (BAJA | MEDIA | ALTA). Antes decía LOW/MEDIUM/HIGH: se unificó al español
 * porque el contrato y los payloads de eventos usan BAJA/MEDIA/ALTA.
 */
const Urgency = Object.freeze({
  BAJA:  'BAJA',
  MEDIA: 'MEDIA',
  ALTA:  'ALTA',
});

/**
 * Transiciones legales de una solicitud de repuesto.
 * Dueño: negociacion.
 *
 * Clave: estado actual. Valor: estados a los que se puede avanzar.
 * COMPLETED y CANCELLED son terminales. Una transición no listada → 422.
 *
 * `RECEIVING_OFFERS`, `OFFER_ACCEPTED` y `COMPLETED` son legales EN EL
 * DOMINIO pero NO salen de una petición HTTP: los ejecuta un caso de uso
 * interno o un consumidor de eventos (negociacion responde 422 si el cliente
 * los pide a mano).
 */
const PART_REQUEST_TRANSITIONS = Object.freeze({
  [PartRequestStatus.PUBLISHED]: [
    PartRequestStatus.RECEIVING_OFFERS,
    PartRequestStatus.OFFER_ACCEPTED,
    PartRequestStatus.CANCELLED,
  ],
  [PartRequestStatus.RECEIVING_OFFERS]: [
    PartRequestStatus.OFFER_ACCEPTED,
    PartRequestStatus.CANCELLED,
  ],
  [PartRequestStatus.OFFER_ACCEPTED]: [PartRequestStatus.COMPLETED],
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
 * Dueño: negociacion.
 *
 * IMPORTANTE: solo puede existir UNA oferta en ACCEPTED por solicitud.
 * Regla garantizada con un índice UNIQUE parcial en la base de datos.
 */
const OfferStatus = Object.freeze({
  SUBMITTED: 'SUBMITTED',   // Enviada, pendiente de decisión.
  ACCEPTED:  'ACCEPTED',    // La elegida. Genera el pedido. Una sola por solicitud.
  REJECTED:  'REJECTED',    // No seleccionada. Queda en el historial.
  WITHDRAWN: 'WITHDRAWN',   // Retirada por el proveedor, con la solicitud abierta.
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
 * Estados del pedido y sus transiciones legales.
 * Dueño: pedidos.
 *
 * La siguiente transición después de PREPARING depende de DeliveryType
 * (DELIVERY → IN_TRANSIT, PICKUP → READY_FOR_PICKUP): patrón Strategy.
 * Una transición no listada devuelve HTTP 422; el rol equivocado, 403.
 *
 * Mismo conjunto que el CHECK de apps/pedidos (V1__init.sql).
 */
const OrderStatus = Object.freeze({
  PENDING_PAYMENT:  'PENDING_PAYMENT',  // Creado a partir de OFFER_ACCEPTED. Espera pago.
  PREPARING:        'PREPARING',        // Pago confirmado; el proveedor prepara.
  IN_TRANSIT:       'IN_TRANSIT',       // Solo si delivery_type = DELIVERY.
  READY_FOR_PICKUP: 'READY_FOR_PICKUP', // Solo si delivery_type = PICKUP.
  DELIVERED:        'DELIVERED',        // Llegó al solicitante.
  COMPLETED:        'COMPLETED',        // El solicitante confirmó la recepción. Terminal.
});

/**
 * Transiciones permitidas del pedido.
 * Clave: estado actual. Valor: estados a los que se puede avanzar.
 *
 *   PENDING_PAYMENT ──(pago)──► PREPARING ──┬─► IN_TRANSIT ──────┬──► DELIVERED ──► COMPLETED
 *                                          └─► READY_FOR_PICKUP ─┘
 */
const ORDER_TRANSITIONS = Object.freeze({
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PREPARING],
  [OrderStatus.PREPARING]: [OrderStatus.IN_TRANSIT, OrderStatus.READY_FOR_PICKUP],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED],
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
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
