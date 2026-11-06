'use strict';

const { validateCreateRequestDto, validateStatusDto, validateSearchFilters } = require('./dto');

/**
 * Controller delgado (AGENTS.md §5): valida DTO → llama caso de uso →
 * responde. Sin lógica de negocio: las transiciones y el ownership viven
 * en domain/application.
 */

/** Proyecta la entidad a la respuesta snake_case del contrato. */
function toResponse(entity) {
  if (!entity) return null;
  return {
    id: entity.id,
    user_id: entity.userId,
    vehicle_brand: entity.vehicleBrand,
    vehicle_model: entity.vehicleModel,
    vehicle_year: entity.vehicleYear,
    description: entity.description,
    city: entity.city,
    urgency: entity.urgency,
    status: entity.status,
    photo: entity.photo,
    created_at: entity.createdAt,
    updated_at: entity.updatedAt,
  };
}

function createPartRequestController({
  createPartRequest,
  changePartRequestStatus,
  getPartRequestById,
  searchPartRequests,
}) {
  return {
    /** POST /api/v1/part-requests */
    create: async (req, res, next) => {
      try {
        const data = validateCreateRequestDto(req.body);
        const request = await createPartRequest.execute({
          userId: req.user.id,
          userEmail: req.user.email,
          data,
          photoPath: req.file ? `/uploads/requests/${req.file.filename}` : null,
          correlationId: req.headers['x-correlation-id'],
        });
        res.status(201).json({
          status: 201,
          msg: 'Solicitud creada exitosamente',
          data: toResponse(request),
        });
      } catch (err) {
        next(err);
      }
    },

    /** GET /api/v1/part-requests */
    list: async (req, res, next) => {
      try {
        const filters = validateSearchFilters(req.query);
        const requests = await searchPartRequests.execute(filters);
        res.status(200).json({
          status: 200,
          msg: 'Solicitudes encontradas',
          data: requests.map(toResponse),
        });
      } catch (err) {
        next(err);
      }
    },

    /** GET /api/v1/part-requests/:id */
    getById: async (req, res, next) => {
      try {
        const request = await getPartRequestById.execute(Number(req.params.id));
        res.status(200).json({ status: 200, msg: 'Solicitud encontrada', data: toResponse(request) });
      } catch (err) {
        next(err);
      }
    },

    /** GET /api/v1/part-requests/:id/check-status (respuesta liviana) */
    checkStatus: async (req, res, next) => {
      try {
        const request = await getPartRequestById.execute(Number(req.params.id));
        res.status(200).json({
          status: 200,
          msg: 'Estado de la solicitud',
          data: { id: request.id, status: request.status },
        });
      } catch (err) {
        next(err);
      }
    },

    /** PATCH /api/v1/part-requests/:id/status */
    updateStatus: async (req, res, next) => {
      try {
        const newStatus = validateStatusDto(req.body);
        const request = await changePartRequestStatus.execute({
          requestId: Number(req.params.id),
          newStatus,
          actorId: req.user.id,
          correlationId: req.headers['x-correlation-id'],
        });
        res.status(200).json({
          status: 200,
          msg: 'Estado actualizado',
          data: toResponse(request),
        });
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createPartRequestController, toResponse };
