'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { SequelizeNotificationRepository } = require('../../src/infrastructure/persistence/notificationRepository');
const { Notification } = require('../../src/domain/entities/notification');

test('toEntity mapea una fila plana a la entidad de dominio', () => {
  const row = {
    id: 1,
    userId: 12,
    role: null,
    type: 'OFFER_SUBMITTED',
    title: 'Nueva oferta',
    message: 'Te ofertaron',
    link: '/x',
    readAt: null,
    createdAt: new Date('2026-11-07T00:00:00Z'),
  };

  const entity = SequelizeNotificationRepository.toEntity(row);

  assert.ok(entity instanceof Notification);
  assert.equal(entity.id, 1);
  assert.equal(entity.title, 'Nueva oferta');
  assert.equal(entity.isRead, false);
});

test('toEntity devuelve null si la fila no existe', () => {
  assert.equal(SequelizeNotificationRepository.toEntity(null), null);
});

test('destinatarioWhere combina userId y role con OR', () => {
  const where = SequelizeNotificationRepository.destinatarioWhere(12, 'ADMIN');
  const orClause = Object.getOwnPropertySymbols(where)
    .map((s) => where[s])
    .find(Array.isArray);

  assert.deepEqual(orClause, [{ userId: 12 }, { role: 'ADMIN' }]);
});
