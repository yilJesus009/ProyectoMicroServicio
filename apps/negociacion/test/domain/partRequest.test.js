'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { PartRequest } = require('../../src/domain/entities/partRequest');
const {
  PartRequestStatus,
  Urgency,
  canTransition,
} = require('../../src/domain/enums');

const base = {
  userId: 12,
  userEmail: 'juan@taller.com',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Hilux',
  vehicleYear: 2019,
  description: 'Filtro de aceite original',
  city: 'La Paz',
};

test('nueva solicitud nace en PUBLISHED con urgencia MEDIA por defecto', () => {
  const request = new PartRequest(base);
  assert.equal(request.status, PartRequestStatus.PUBLISHED);
  assert.equal(request.urgency, Urgency.MEDIA);
  assert.equal(request.id, null);
});

test('transiciones legales: PUBLISHED → ORDERED y PUBLISHED → CANCELLED', () => {
  const request = new PartRequest(base);
  const previous = request.changeStatus(PartRequestStatus.ORDERED);
  assert.equal(previous, PartRequestStatus.PUBLISHED);
  assert.equal(request.status, PartRequestStatus.ORDERED);

  request.changeStatus(PartRequestStatus.COMPLETED);
  assert.equal(request.status, PartRequestStatus.COMPLETED);
});

test('transición inválida lanza InvalidPartRequestTransitionException (→ 422)', () => {
  const request = new PartRequest(base); // PUBLISHED
  assert.throws(
    () => request.changeStatus(PartRequestStatus.COMPLETED),
    (err) => {
      assert.equal(err.name, 'InvalidPartRequestTransitionException');
      return true;
    }
  );
});

test('estados terminales no aceptan transiciones', () => {
  const completed = new PartRequest({ ...base, status: PartRequestStatus.COMPLETED });
  assert.throws(() => completed.changeStatus(PartRequestStatus.PUBLISHED));

  const cancelled = new PartRequest({ ...base, status: PartRequestStatus.CANCELLED });
  assert.throws(() => cancelled.changeStatus(PartRequestStatus.ORDERED));
});

test('ciclo ORDERED → PUBLISHED está prohibido', () => {
  assert.equal(
    canTransition(PartRequestStatus.ORDERED, PartRequestStatus.PUBLISHED),
    false
  );
});
