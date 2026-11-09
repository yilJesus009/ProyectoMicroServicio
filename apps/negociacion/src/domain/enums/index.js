'use strict';

/**
 * Enums de dominio de una solicitud de repuesto.
 *
 * Espejo de `packages/shared/src/enums/status.js`: los workspaces de npm
 * aún no están configurados (ver packages/shared/README.md) y la imagen de
 * Docker solo copia este servicio, así que el dominio no puede importar el
 * paquete compartido todavía. Cuando el equipo active los workspaces, este
 * archivo pasa a re-exportar desde @repuestos/shared.
 *
 * Valores según docs/flujo-principal.md:
 *   - urgency: BAJA | MEDIA | ALTA
 *   - status:  PUBLISHED | RECEIVING_OFFERS | OFFER_ACCEPTED | COMPLETED | CANCELLED
 */

const PartRequestStatus = Object.freeze({
  PUBLISHED: 'PUBLISHED', // Visible para proveedores. Todavía sin ofertas.
  // Lo asigna el caso de uso de enviar la primera oferta (fase 2), no el
  // cliente: un PATCH con este estado responde 422 (EventDrivenStatusException).
  RECEIVING_OFFERS: 'RECEIVING_OFFERS',
  // Lo asigna el caso de uso de aceptar una oferta (fase 2), no el cliente.
  OFFER_ACCEPTED: 'OFFER_ACCEPTED',
  // Lo asigna el consumidor de ORDER_STATUS_CHANGED=COMPLETED (Pedidos),
  // no el cliente. docs/flujo-principal.md: "el comprador nunca puede
  // poner OFFER_ACCEPTED ni COMPLETED a mano".
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED', // El dueño cancela antes de aceptar una oferta.
});

const Urgency = Object.freeze({
  BAJA: 'BAJA',
  MEDIA: 'MEDIA',
  ALTA: 'ALTA',
});

/**
 * Máquina de transiciones legales. Clave: estado actual.
 * Fuente: docs/flujo-principal.md, sección "Estados > Solicitud (Negociación)".
 *
 *   PUBLISHED ──► RECEIVING_OFFERS (primera oferta)         ← vía evento
 *   PUBLISHED, RECEIVING_OFFERS ──► OFFER_ACCEPTED           ← vía evento
 *   PUBLISHED, RECEIVING_OFFERS ──► CANCELLED (el dueño cancela)
 *   OFFER_ACCEPTED ──► COMPLETED (evento ORDER_STATUS_CHANGED)  ← vía evento
 *   COMPLETED y CANCELLED son estados terminales.
 *
 * Una transición no listada se rechaza con HTTP 422.
 *
 * Las marcadas "vía evento" quedan en la máquina porque son legales EN EL
 * DOMINIO: las ejecuta un caso de uso interno o un consumidor de eventos,
 * nunca un cliente por PATCH. El caso de uso de HTTP las bloquea antes de
 * llegar aquí con EventDrivenStatusException (ver application/contracts.js).
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
 * Determina si una transición de estado es legal.
 *
 * @param {string} from Estado actual
 * @param {string} to Estado deseado
 * @returns {boolean}
 */
function canTransition(from, to) {
  const allowed = PART_REQUEST_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * Estados de una oferta (docs/flujo-principal.md, sección "Oferta").
 * Solo SUBMITTED es un estado vivo; las otras tres son terminales.
 */
const OfferStatus = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
});

const OFFER_TRANSITIONS = Object.freeze({
  [OfferStatus.SUBMITTED]: [OfferStatus.ACCEPTED, OfferStatus.REJECTED, OfferStatus.WITHDRAWN],
  [OfferStatus.ACCEPTED]: [],
  [OfferStatus.REJECTED]: [],
  [OfferStatus.WITHDRAWN]: [],
});

function canTransitionOffer(from, to) {
  const allowed = OFFER_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

const OfferCondition = Object.freeze({ NEW: 'NEW', USED: 'USED', REFURBISHED: 'REFURBISHED' });
const OfferAvailability = Object.freeze({ IN_STOCK: 'IN_STOCK', ON_ORDER: 'ON_ORDER' });
const DeliveryType = Object.freeze({ PICKUP: 'PICKUP', DELIVERY: 'DELIVERY' });

module.exports = {
  PartRequestStatus,
  Urgency,
  PART_REQUEST_TRANSITIONS,
  canTransition,
  OfferStatus,
  OFFER_TRANSITIONS,
  canTransitionOffer,
  OfferCondition,
  OfferAvailability,
  DeliveryType,
};
