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
 * Valores según docs/contratos-api.md:
 *   - urgency: BAJA | MEDIA | ALTA
 *   - status:  PUBLISHED | ORDERED | COMPLETED | CANCELLED
 */

const PartRequestStatus = Object.freeze({
  PUBLISHED: 'PUBLISHED', // Visible para proveedores. Acepta ofertas.
  ORDERED: 'ORDERED', // Oferta aceptada y pedido generado.
  COMPLETED: 'COMPLETED', // El pedido se finalizó.
  CANCELLED: 'CANCELLED', // Cancelada (antes de aceptar una oferta).
});

const Urgency = Object.freeze({
  BAJA: 'BAJA',
  MEDIA: 'MEDIA',
  ALTA: 'ALTA',
});

/**
 * Máquina de transiciones legales. Clave: estado actual.
 *
 *   PUBLISHED ──► ORDERED   (oferta aceptada)
 *   PUBLISHED ──► CANCELLED (el dueño cancela antes de aceptar oferta)
 *   ORDERED   ──► COMPLETED (pedido finalizado)
 *   COMPLETED y CANCELLED son estados terminales.
 *
 * Una transición no listada se rechaza con HTTP 422.
 * Documentada en docs/contratos-api.md (PATCH .../status).
 */
const PART_REQUEST_TRANSITIONS = Object.freeze({
  [PartRequestStatus.PUBLISHED]: [PartRequestStatus.ORDERED, PartRequestStatus.CANCELLED],
  [PartRequestStatus.ORDERED]: [PartRequestStatus.COMPLETED],
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

module.exports = { PartRequestStatus, Urgency, PART_REQUEST_TRANSITIONS, canTransition };
