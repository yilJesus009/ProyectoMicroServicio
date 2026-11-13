'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/presentation/http/createApp');

test('POST /api/v1/offers exige rol proveedor y devuelve envelope', async (t) => {
  process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';
  const fakeOffer = { toJSON: () => ({ id: 1, status: 'SUBMITTED' }) };
  const app = createApp({
    createOffer: { execute: async () => fakeOffer },
    acceptOffer: { execute: async () => fakeOffer },
    getOffers: {
      byRequest: async () => [fakeOffer],
      byProvider: async () => [fakeOffer],
      byId: async () => fakeOffer,
    },
  });
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/v1/offers`;
  const buyerToken = jwt.sign({ id: 12, role: 'COMPRADOR' }, process.env.JWT_SECRET);
  const providerToken = jwt.sign({ id: 55, role: 'PROVEEDOR' }, process.env.JWT_SECRET);

  const denied = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${buyerToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ request_id: 34 }),
  });
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), {
    status: 403,
    msg: 'No tienes permiso para esta operación',
    data: null,
  });

  const accepted = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${providerToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ request_id: 34 }),
  });
  assert.equal(accepted.status, 201);
  assert.deepEqual(await accepted.json(), {
    status: 201,
    msg: 'Oferta creada',
    data: { id: 1, status: 'SUBMITTED' },
  });

  const ownOffers = await fetch(url, {
    headers: { authorization: `Bearer ${providerToken}` },
  });
  assert.equal(ownOffers.status, 200);
  assert.equal((await ownOffers.json()).data.length, 1);
});

test('responde con envelope 400 cuando el JSON está mal formado', async (t) => {
  process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';
  const app = createApp({
    createOffer: { execute: async () => { throw new Error('No debe ejecutarse'); } },
    acceptOffer: { execute: async () => {} },
    getOffers: {},
  });
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const token = jwt.sign({ id: 55, role: 'PROVEEDOR' }, process.env.JWT_SECRET);

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/offers`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: '{',
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    status: 400,
    msg: 'El cuerpo JSON no es válido',
    data: null,
  });
});
