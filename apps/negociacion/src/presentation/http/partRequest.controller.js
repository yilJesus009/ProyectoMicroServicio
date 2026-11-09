'use strict';

const fs = require('fs');
const path = require('path');
const { validateCreateRequestDto, validateOpenFilters } = require('./dto');
const { PartRequestStatus } = require('../../domain/enums');
const { PartRequestPhotoNotFoundException } = require('../../domain/errors');

/**
 * Controller delgado (AGENTS.md §5): valida DTO → llama caso de uso →
 * responde. Sin lógica de negocio: las transiciones, la visibilidad y el
 * ownership viven en domain/application.
 */

/** Proyecta la entidad a la respuesta snake_case del contrato. */
function toResponse(entity) {
  if (!entity) return null;
  return {
    id: entity.id,
    user_id: entity.userId,
    category_id: entity.categoryId,
    category_name: entity.categoryName,
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
  cancelPartRequest,
  getPartRequestById,
  listMyPartRequests,
  listOpenPartRequests,
}) {
  return {
    /** POST /api/v1/part-requests */
    create: async (req, res, next) => {
      try {
        const data = validateCreateRequestDto(req.body);
        const request = await createPartRequest.execute({
          userId: req.user.id,
          userEmail: req.user.email,
          token: req.token,
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

    /** GET /api/v1/part-requests/mine */
    mine: async (req, res, next) => {
      try {
        const requests = await listMyPartRequests.execute(req.user.id);
        res.status(200).json({ status: 200, msg: 'Solicitudes encontradas', data: requests.map(toResponse) });
      } catch (err) {
        next(err);
      }
    },

    /** GET /api/v1/part-requests/open?city=&category_id= */
    open: async (req, res, next) => {
      try {
        const filters = validateOpenFilters(req.query);
        const requests = await listOpenPartRequests.execute(req.user.id, filters);
        res.status(200).json({ status: 200, msg: 'Solicitudes abiertas', data: requests.map(toResponse) });
      } catch (err) {
        next(err);
      }
    },

    /** GET /api/v1/part-requests/:id */
    getById: async (req, res, next) => {
      try {
        const request = await getPartRequestById.execute(Number(req.params.id), {
          requesterId: req.user.id,
        });
        res.status(200).json({ status: 200, msg: 'Solicitud encontrada', data: toResponse(request) });
      } catch (err) {
        next(err);
      }
    },

    /** GET /api/v1/part-requests/:id/photo — misma regla de visibilidad que el detalle. */
    photo: async (req, res, next) => {
      try {
        const request = await getPartRequestById.execute(Number(req.params.id), {
          requesterId: req.user.id,
        });
        if (!request.photo) throw new PartRequestPhotoNotFoundException(request.id);

        const filePath = path.resolve(__dirname, '../../../', request.photo.replace(/^\/+/, ''));
        if (!fs.existsSync(filePath)) throw new PartRequestPhotoNotFoundException(request.id);

        res.sendFile(filePath);
      } catch (err) {
        next(err);
      }
    },

    /** PATCH /api/v1/part-requests/:id/cancel */
    cancel: async (req, res, next) => {
      try {
        const request = await cancelPartRequest.execute({
          requestId: Number(req.params.id),
          newStatus: PartRequestStatus.CANCELLED,
          actorId: req.user.id,
          correlationId: req.headers['x-correlation-id'],
        });
        res.status(200).json({ status: 200, msg: 'Solicitud cancelada', data: toResponse(request) });
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createPartRequestController, toResponse };
