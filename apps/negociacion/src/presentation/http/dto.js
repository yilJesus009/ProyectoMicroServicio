'use strict';

const { ValidationException } = require('../../domain/errors');
const { Urgency } = require('../../domain/enums');

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
  const required = ['category_id', 'vehicle_brand', 'vehicle_model', 'vehicle_year', 'description', 'city'];
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || String(body[field]).trim() === '') {
      throw new ValidationException(`El campo '${field}' es obligatorio`);
    }
  }

  const categoryId = Number(body.category_id);
  if (!Number.isInteger(categoryId)) {
    throw new ValidationException(`El campo 'category_id' debe ser un número entero`);
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
    categoryId,
    vehicleBrand: String(body.vehicle_brand).trim(),
    vehicleModel: String(body.vehicle_model).trim(),
    vehicleYear,
    description: String(body.description).trim(),
    city: String(body.city).trim(),
    urgency,
  };
}

/** GET /part-requests/open?city=&category_id= */
function validateOpenFilters(query = {}) {
  const filters = {};

  if (query.city) filters.city = String(query.city);

  if (query.category_id !== undefined) {
    const categoryId = Number(query.category_id);
    if (!Number.isInteger(categoryId)) {
      throw new ValidationException(`El filtro 'category_id' debe ser un número entero`);
    }
    filters.categoryId = categoryId;
  }

  return filters;
}

module.exports = { validateCreateRequestDto, validateOpenFilters };
