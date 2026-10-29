'use strict';

const { PartRequest } = require('../../domain/entities/partRequest');
const { Topic, PartRequestEvent } = require('../contracts');

/**
 * Caso de uso: crear una solicitud de repuesto.
 *
 * Orquesta: entidad (regla) → repositorio (persistencia) → publica evento.
 * El publish NUNCA rompe la operación (docs/eventos.md regla 3).
 */
class CreatePartRequest {
  constructor({ partRequestRepository, eventPublisher }) {
    this.partRequestRepository = partRequestRepository;
    this.eventPublisher = eventPublisher;
  }

  /**
   * @param {Object} params
   * @param {number} params.userId Id del dueño (claim user_id del JWT)
   * @param {string} params.userEmail Email del dueño
   * @param {Object} params.data DTO validado (camelCase)
   * @param {string|null} [params.photoPath] Ruta de la foto subida
   * @param {string} [params.correlationId] X-Correlation-Id del Gateway
   * @returns {Promise<PartRequest>}
   */
  async execute({ userId, userEmail, data, photoPath = null, correlationId }) {
    const request = new PartRequest({
      userId,
      userEmail,
      vehicleBrand: data.vehicleBrand,
      vehicleModel: data.vehicleModel,
      vehicleYear: data.vehicleYear,
      description: data.description,
      city: data.city,
      urgency: data.urgency,
      photo: photoPath,
    });

    const saved = await this.partRequestRepository.save(request);

    try {
      await this.eventPublisher.publish(
        Topic.PART_REQUEST,
        PartRequestEvent.CREATED,
        {
          request_id: saved.id,
          user_id: saved.userId,
          user_email: saved.userEmail,
          vehicle_brand: saved.vehicleBrand,
          vehicle_model: saved.vehicleModel,
          vehicle_year: saved.vehicleYear,
          city: saved.city,
          urgency: saved.urgency,
        },
        correlationId
      );
    } catch (error) {
      console.error('[CreatePartRequest] no se pudo publicar PART_REQUEST_CREATED:', error.message);
    }

    return saved;
  }
}

module.exports = { CreatePartRequest };
