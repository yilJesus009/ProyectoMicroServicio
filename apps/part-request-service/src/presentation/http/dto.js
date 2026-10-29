'use strict';

const { ValidationException } = require('../../domain/errors');
const { Urgency, PartRequestStatus } = require('../../domain/enums');

/**
 * Validación de DTOs (entrada HTTP).
 *
 * Aquí se validan FORMA y ENUMS → error 400.
 * Las reglas de negocio (transiciones, ownership) viven en domain/application.
 */

/**
 * POST /api/v1/part-requests (multipart: todo llega como string).
 * @returns {Object} data en camelCase, lista para el caso de uso
 */
function validateCreateRequestDto(body = {}) {
  const required = ['vehicle_brand', 'vehicle_model', 'vehicle_year', 'description', 'city'];
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || String(body[field]).trim() === '') {
      throw new ValidationException(`El campo '${field}' es obligatorio`);
    }
  }

  const vehicleYear = Number(body.vehicle_year);
  if (!Number.isInteger(vehicleYear)) {
    throw new ValidationException(`El campo 'vehicle_year' debe ser un número entero`);
  }

  const urgency = body.urgency || Urgency.MEDIA;
  if (!Object.values(Urgency).includes(urgency)) {
    throw new ValidationException(
      `El campo 'urgency' debe ser ${Object.values(Urgency).join(' | ')}`
    );
  }

  return {
    vehicleBrand: String(body.vehicle_brand).trim(),
    vehicleModel: String(body.vehicle_model).trim(),
    vehicleYear,
    description: String(body.description).trim(),
    city: String(body.city).trim(),
    urgency,
  };
}

/** PATCH .../status */
function validateStatusDto(body = {}) {
  if (!body.status) {
    throw new ValidationException(`El campo 'status' es obligatorio`);
  }
  if (!Object.values(PartRequestStatus).includes(body.status)) {
    throw new ValidationException(
      `El campo 'status' debe ser ${Object.values(PartRequestStatus).join(' | ')}`
    );
  }
  return body.status;
}

/** GET con filtros de query */
function validateSearchFilters(query = {}) {
  const filters = {};

  if (query.city) filters.city = String(query.city);

  if (query.status) {
    if (!Object.values(PartRequestStatus).includes(query.status)) {
      throw new ValidationException(
        `El filtro 'status' debe ser ${Object.values(PartRequestStatus).join(' | ')}`
      );
    }
    filters.status = query.status;
  }

  if (query.urgency) {
    if (!Object.values(Urgency).includes(query.urgency)) {
      throw new ValidationException(
        `El filtro 'urgency' debe ser ${Object.values(Urgency).join(' | ')}`
      );
    }
    filters.urgency = query.urgency;
  }

  return filters;
}

module.exports = { validateCreateRequestDto, validateStatusDto, validateSearchFilters };
