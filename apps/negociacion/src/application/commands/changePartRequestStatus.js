'use strict';

const {
  PartRequestNotFoundException,
  ForbiddenException,
  PartRequestStatusConflictException,
  EventDrivenStatusException,
} = require('../../domain/errors');
const { Topic, PartRequestEvent, EVENT_DRIVEN_STATUS } = require('../contracts');
const { buildEventEnvelope } = require('../buildEventEnvelope');

/**
 * Caso de uso: cambiar el estado de una solicitud (PATCH .../status).
 *
 * Reglas:
 *   1. La solicitud debe existir                → 404
 *   2. Solo el dueño puede cambiarla             → 403
 *   3. Estados dirigidos por evento no entran    → 422 (contracts.js)
 *   4. La transición debe ser legal              → 422 (valida la entidad)
 *   5. La escritura debe ganar la carrera        → 409 (compare-and-swap)
 *
 * El compare-and-swap y el insert en el outbox viajan en la MISMA
 * transacción: si el outbox falla, el cambio de estado también se revierte
 * (docs/eventos.md). Publicar de verdad lo hace un proceso aparte.
 */
class ChangePartRequestStatus {
  constructor({ partRequestRepository, outboxRepository, unitOfWork, producer }) {
    this.partRequestRepository = partRequestRepository;
    this.outboxRepository = outboxRepository;
    this.unitOfWork = unitOfWork;
    this.producer = producer;
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

    // 3. Estado dirigido por evento: el dueño no puede declararlo por su
    //    cuenta (ver application/contracts.js EVENT_DRIVEN_STATUS).
    const drivenBy = EVENT_DRIVEN_STATUS[newStatus];
    if (drivenBy) {
      throw new EventDrivenStatusException(newStatus, drivenBy);
    }

    // 4. Regla de dominio → 422. Valida SIN mutar: todavía no escribimos.
    request.assertCanTransition(newStatus);

    return this.unitOfWork.run(async (transaction) => {
      // 5. Compare-and-swap atómico: de dos PATCH simultáneos solo uno gana.
      const won = await this.partRequestRepository.updateStatusIfCurrent(
        request.id,
        previousStatus,
        newStatus,
        { transaction }
      );
      if (!won) throw new PartRequestStatusConflictException(request.id);

      // Releemos dentro de la misma transacción: ya tiene el estado real.
      const saved =
        (await this.partRequestRepository.findById(request.id, { transaction })) || request;

      const envelope = buildEventEnvelope({
        eventName: PartRequestEvent.STATUS_CHANGED,
        producer: this.producer,
        correlationId,
        payload: {
          request_id: saved.id,
          previous_status: previousStatus,
          new_status: saved.status,
        },
      });
      await this.outboxRepository.enqueue(envelope, {
        exchange: Topic.PART_REQUEST,
        routingKey: PartRequestEvent.STATUS_CHANGED,
        transaction,
      });

      return saved;
    });
  }
}

module.exports = { ChangePartRequestStatus };
