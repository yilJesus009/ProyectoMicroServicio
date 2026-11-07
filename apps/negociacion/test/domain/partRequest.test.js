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

test('transiciones legales: PUBLISHED → OFFER_ACCEPTED → COMPLETED, y PUBLISHED → CANCELLED', () => {
  const request = new PartRequest(base);
  const previous = request.changeStatus(PartRequestStatus.OFFER_ACCEPTED);
  assert.equal(previous, PartRequestStatus.PUBLISHED);
  assert.equal(request.status, PartRequestStatus.OFFER_ACCEPTED);

  request.changeStatus(PartRequestStatus.COMPLETED);
  assert.equal(request.status, PartRequestStatus.COMPLETED);

  const other = new PartRequest(base);
  other.changeStatus(PartRequestStatus.CANCELLED);
  assert.equal(other.status, PartRequestStatus.CANCELLED);
});

test('la primera oferta deja la solicitud en RECEIVING_OFFERS, desde ahí también se puede aceptar o cancelar', () => {
  const request = new PartRequest(base);
  request.changeStatus(PartRequestStatus.RECEIVING_OFFERS);
  assert.equal(request.status, PartRequestStatus.RECEIVING_OFFERS);
  assert.equal(canTransition(PartRequestStatus.RECEIVING_OFFERS, PartRequestStatus.OFFER_ACCEPTED), true);
  assert.equal(canTransition(PartRequestStatus.RECEIVING_OFFERS, PartRequestStatus.CANCELLED), true);
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
  assert.throws(() => cancelled.changeStatus(PartRequestStatus.OFFER_ACCEPTED));
});

test('ciclo OFFER_ACCEPTED → PUBLISHED está prohibido', () => {
  assert.equal(
    canTransition(PartRequestStatus.OFFER_ACCEPTED, PartRequestStatus.PUBLISHED),
    false
  );
});
