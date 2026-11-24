'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { toResponse } = require('../../src/presentation/http/partRequest.controller');
const { PartRequest } = require('../../src/domain/entities/partRequest');
const { PartRequestStatus, Urgency } = require('../../src/domain/enums');

test('toResponse incluye vehicle_label armado desde marca, modelo y año (GET /part-requests/{id})', () => {
  const request = new PartRequest({
    id: 1,
    userId: 10,
    categoryId: 2,
    categoryName: 'Frenos',
    vehicleBrand: 'Toyota',
    vehicleModel: 'Corolla',
    vehicleYear: 2018,
    description: 'Pastillas de freno delanteras',
    city: 'Santa Cruz',
    urgency: Urgency.ALTA,
    status: PartRequestStatus.PUBLISHED,
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  const response = toResponse(request);

  assert.equal(response.vehicle_label, 'Toyota Corolla 2018');
  assert.equal(response.vehicle_brand, 'Toyota');
  assert.equal(response.vehicle_model, 'Corolla');
  assert.equal(response.vehicle_year, 2018);
});

test('toResponse con entidad null devuelve null (sin romper por vehicle_label)', () => {
  assert.equal(toResponse(null), null);
});
