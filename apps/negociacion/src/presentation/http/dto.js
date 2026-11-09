'use strict';

const { ValidationException } = require('../../domain/errors');
const { Urgency, OfferCondition, OfferAvailability, DeliveryType } = require('../../domain/enums');

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

/** POST /api/v1/part-requests/:id/offers */
function validateSubmitOfferDto(body = {}) {
  const required = ['price', 'brand', 'condition', 'availability', 'delivery_type', 'estimated_days'];
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || String(body[field]).trim() === '') {
      throw new ValidationException(`El campo '${field}' es obligatorio`);
    }
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new ValidationException(`El campo 'price' debe ser un número mayor a 0`);
  }

  if (!Object.values(OfferCondition).includes(body.condition)) {
    throw new ValidationException(`El campo 'condition' debe ser ${Object.values(OfferCondition).join(' | ')}`);
  }
  if (!Object.values(OfferAvailability).includes(body.availability)) {
    throw new ValidationException(
      `El campo 'availability' debe ser ${Object.values(OfferAvailability).join(' | ')}`
    );
  }
  if (!Object.values(DeliveryType).includes(body.delivery_type)) {
    throw new ValidationException(`El campo 'delivery_type' debe ser ${Object.values(DeliveryType).join(' | ')}`);
  }

  const estimatedDays = Number(body.estimated_days);
  if (!Number.isInteger(estimatedDays) || estimatedDays < 0) {
    throw new ValidationException(`El campo 'estimated_days' debe ser un número entero >= 0`);
  }

  return {
    price,
    brand: String(body.brand).trim(),
    condition: body.condition,
    availability: body.availability,
    deliveryType: body.delivery_type,
    estimatedDays,
    notes: body.notes ? String(body.notes).trim() : null,
  };
}

/** GET /part-requests/:id/offers?sort=price|days */
function validateOffersSort(query = {}) {
  if (query.sort === undefined) return undefined;
  if (query.sort !== 'price' && query.sort !== 'days') {
    throw new ValidationException(`El filtro 'sort' debe ser price | days`);
  }
  return query.sort;
}

module.exports = {
  validateCreateRequestDto,
  validateOpenFilters,
  validateSubmitOfferDto,
  validateOffersSort,
};
