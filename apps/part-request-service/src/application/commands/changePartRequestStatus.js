'use strict';

const { PartRequestNotFoundException, ForbiddenException } = require('../../domain/errors');
const { Topic, PartRequestEvent } = require('../contracts');

/**
 * Caso de uso: cambiar el estado de una solicitud (PATCH .../status).
 *
 * Reglas:
 *   1. La solicitud debe existir            → 404
 *   2. Solo el dueño puede cambiarla        → 403
 *   3. La transición debe ser legal         → 422 (valida la entidad)
 *
 * La validación de ENUM llega desde el controller (400); la máquina de
 * transiciones vive en la entidad de dominio.
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

    const previousStatus = request.changeStatus(newStatus); // regla de dominio → 422
    const saved = await this.partRequestRepository.save(request);

    try {
      await this.eventPublisher.publish(
        Topic.PART_REQUEST,
        PartRequestEvent.STATUS_CHANGED,
        {
          request_id: saved.id,
          previous_status: previousStatus,
          new_status: saved.status,
        },
        correlationId
      );
    } catch (error) {
      console.error(
        '[ChangePartRequestStatus] no se pudo publicar PART_REQUEST_STATUS_CHANGED:',
        error.message
      );
    }

    return saved;
  }
}

module.exports = { ChangePartRequestStatus };
