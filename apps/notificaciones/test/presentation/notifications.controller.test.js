'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createNotificationsController } = require('../../src/presentation/http/notifications.controller');
const { Notification } = require('../../src/domain/entities/notification');

function makeRes() {
  const res = {};
  res.statusCode = null;
  res.body = null;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

test('GET mine responde con el sobre {status, msg, data} y toma userId/rol del token', async () => {
  const aviso = new Notification({
    id: 1,
    type: 'OFFER_SUBMITTED',
    title: 'Nueva oferta',
    message: 'Te ofertaron',
    link: '/comprador/solicitudes/1',
    createdAt: new Date('2026-11-07T00:00:00Z'),
  });
  let received = null;
  const listMyNotifications = {
    execute: async (params) => {
      received = params;
      return [aviso];
    },
  };
  const controller = createNotificationsController({
    listMyNotifications,
    countUnreadNotifications: {},
  });

  const req = { user: { id: 12, rol: 'COMPRADOR' }, query: { unread: 'true' } };
  const res = makeRes();
  await controller.mine(req, res, (err) => assert.fail(err));

  assert.deepEqual(received, { userId: 12, role: 'COMPRADOR', unreadOnly: true });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].read, false);
  assert.equal(res.body.data[0].title, 'Nueva oferta');
});

test('GET unread-count responde {count}', async () => {
  const countUnreadNotifications = { execute: async () => 5 };
  const controller = createNotificationsController({
    listMyNotifications: {},
    countUnreadNotifications,
  });

  const req = { user: { id: 12, rol: 'COMPRADOR' }, query: {} };
  const res = makeRes();
  await controller.unreadCount(req, res, (err) => assert.fail(err));

  assert.deepEqual(res.body, { status: 200, msg: 'Conteo de avisos sin leer', data: { count: 5 } });
});
