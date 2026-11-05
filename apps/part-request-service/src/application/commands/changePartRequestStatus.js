'use strict';

const {
  PartRequestNotFoundException,
  ForbiddenException,
  PartRequestStatusConflictException,
  EventDrivenStatusException,
} = require('../../domain/errors');
const { Topic, PartRequestEvent, EVENT_DRIVEN_STATUS } = require('../contracts');
const { publishFireAndForget } = require('../publishFireAndForget');

/**
 * Caso de uso: cambiar el estado de una solicitud (PATCH .../status).
 *
 * Reglas:
 *   1. La solicitud debe existir            → 404
 *   2. Solo el dueño puede cambiarla        → 403
 *   3. ORDERED no sale de una petición      → 422 (lo asigna OFFER_ACCEPTED)
 *   4. La transición debe ser legal         → 422 (valida la entidad)
 *   5. La escritura debe ganar la carrera   → 409 (compare-and-swap)
 *
 * La validación de ENUM llega desde el controller (400); la máquina de
 * transiciones vive en la entidad de dominio.
 *
 * El evento se publica SIN esperar al broker (eventos.md regla 3): el dato
 * ya está persistido antes de responder.
 */
class ChangePartRequestStatus {
  constructor({ partRequestRepository, eventPublisher }) {
    this.partRequestRepository = partRequestRepository;
    this.eventPublisher = eventPublisher;
  }

  /**
   * @param {Object} params
   * @param {number} params.requestId Id de la solicitud
   * @param {string} params.newStatus Estado deseado
   * @param {number} params.actorId Quién ejecuta (del JWT)
   * @param {string} [params.correlationId]
   * @returns {Promise<import('../../domain/entities/partRequest').PartRequest>}
   */
  async execute({ requestId, newStatus, actorId, correlationId }) {
    const request = await this.partRequestRepository.findById(requestId);
    if (!request) throw new PartRequestNotFoundException(requestId);

    if (request.userId !== actorId) {
      throw new ForbiddenException('Solo el dueño de la solicitud puede cambiar su estado');
    }

    const previousStatus = request.status;

    // 3. Estado dirigido por eventos: el dueño no puede declarar por su
    //    cuenta que ya tiene oferta aceptada. Lo dice quien la acepta
    //    (docs/arquitectura.md: part-request cambia a ORDERED al recibir
    //    OFFER_ACCEPTED). Mientras no exista ese consumidor, ORDERED es
    //    inalcanzable desde el cliente — que es exactamente lo correcto.
    const drivenBy = EVENT_DRIVEN_STATUS[newStatus];
    if (drivenBy) {
      throw new EventDrivenStatusException(newStatus, drivenBy);
    }

    // 4. Regla de dominio → 422. Valida SIN mutar: todavía no escribimos.
    request.assertCanTransition(newStatus);

    // 5. Compare-and-swap atómico: de dos PATCH simultáneos solo uno gana.
    //    El perdedor recibe 409 y NO publica evento (el historial de
    //    eventos no puede adelantarse a lo que quedó en la base).
    const won = await this.partRequestRepository.updateStatusIfCurrent(
      request.id,
      previousStatus,
      newStatus
    );
    if (!won) throw new PartRequestStatusConflictException(request.id);

    // Releemos: la base ya tiene el estado real (y el updatedAt fresco).
    const saved = (await this.partRequestRepository.findById(request.id)) || request;

    publishFireAndForget(
      this.eventPublisher,
      'ChangePartRequestStatus',
      Topic.PART_REQUEST,
      PartRequestEvent.STATUS_CHANGED,
      {
        request_id: saved.id,
        previous_status: previousStatus,
        new_status: saved.status,
      },
      correlationId
    );

    return saved;
  }
}

module.exports = { ChangePartRequestStatus };
