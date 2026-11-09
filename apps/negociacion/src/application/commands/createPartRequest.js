'use strict';

const { PartRequest } = require('../../domain/entities/partRequest');
const { CategoryInactiveException } = require('../../domain/errors');
const { Topic, PartRequestEvent } = require('../contracts');
const { buildEventEnvelope } = require('../buildEventEnvelope');

/**
 * Caso de uso: crear una solicitud de repuesto.
 *
 * Primero valida `category_id` contra Catálogo (HTTP, fuera de la
 * transacción: no tiene sentido tener una conexión de base abierta
 * esperando una respuesta de red). Rechaza categorías inactivas
 * (docs/contratos-api.md: Negociación la usa para validar).
 *
 * Después orquesta: entidad (regla) → repositorio (persistencia) → outbox,
 * todo en la MISMA transacción (docs/eventos.md): si el outbox no se puede
 * guardar, la solicitud tampoco queda guardada. Un proceso aparte
 * (infrastructure/messaging/outboxPublisherWorker.js) publica después.
 */
class CreatePartRequest {
  constructor({ partRequestRepository, outboxRepository, unitOfWork, categoryGateway, producer }) {
    this.partRequestRepository = partRequestRepository;
    this.outboxRepository = outboxRepository;
    this.unitOfWork = unitOfWork;
    this.categoryGateway = categoryGateway;
    this.producer = producer;
  }

  /**
   * @param {Object} params
   * @param {number} params.userId Id del dueño (claim user_id del JWT)
   * @param {string} params.userEmail Email del dueño
   * @param {string} params.token JWT crudo, para reenviar a Catálogo
   * @param {Object} params.data DTO validado (camelCase), incluye categoryId
   * @param {string|null} [params.photoPath] Ruta de la foto subida
   * @param {string} [params.correlationId] X-Correlation-Id del Gateway
   * @returns {Promise<PartRequest>}
   */
  async execute({ userId, userEmail, token, data, photoPath = null, correlationId }) {
    const category = await this.categoryGateway.findById(data.categoryId, token);
    if (category.active === false) {
      throw new CategoryInactiveException(data.categoryId);
    }

    const request = new PartRequest({
      userId,
      userEmail,
      categoryId: category.id,
      categoryName: category.name,
      vehicleBrand: data.vehicleBrand,
      vehicleModel: data.vehicleModel,
      vehicleYear: data.vehicleYear,
      description: data.description,
      city: data.city,
      urgency: data.urgency,
      photo: photoPath,
    });

    return this.unitOfWork.run(async (transaction) => {
      const saved = await this.partRequestRepository.save(request, { transaction });

      const envelope = buildEventEnvelope({
        eventName: PartRequestEvent.CREATED,
        producer: this.producer,
        correlationId,
        payload: {
          part_request_id: saved.id,
          buyer_id: saved.userId,
          category_id: saved.categoryId,
          category_name: saved.categoryName,
          vehicle_label: saved.vehicleLabel,
          description: saved.description,
          city: saved.city,
          urgency: saved.urgency,
        },
      });
      await this.outboxRepository.enqueue(envelope, {
        exchange: Topic.PART_REQUEST,
        routingKey: PartRequestEvent.CREATED,
        transaction,
      });

      return saved;
    });
  }
}

module.exports = { CreatePartRequest };
