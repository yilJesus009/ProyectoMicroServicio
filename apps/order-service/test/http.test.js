'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/presentation/http/createApp');

test('POST /api/v1/orders/:id/complete exige comprador y responde con envelope', async (t) => {
  process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';
  const order = { toJSON: () => ({ id: 4, status: 'COMPLETED' }) };
  const app = createApp({
    getOrders: { byId: async () => order, byBuyer: async () => [order], byProvider: async () => [order] },
    changeOrderStatus: { execute: async () => order },
  });
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/v1/orders/4/complete`;
  const providerToken = jwt.sign({ id: 55, role: 'PROVEEDOR' }, process.env.JWT_SECRET);
  const buyerToken = jwt.sign({ id: 12, role: 'COMPRADOR' }, process.env.JWT_SECRET);
  const listUrl = `http://127.0.0.1:${server.address().port}/api/v1/orders`;

  const buyerOrders = await fetch(listUrl, {
    headers: { authorization: `Bearer ${buyerToken}` },
  });
  assert.equal(buyerOrders.status, 200);
  assert.equal((await buyerOrders.json()).data.length, 1);

  const providerOrders = await fetch(listUrl, {
    headers: { authorization: `Bearer ${providerToken}` },
  });
  assert.equal(providerOrders.status, 200);
  assert.equal((await providerOrders.json()).data.length, 1);

  const denied = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${providerToken}` },
  });
  assert.equal(denied.status, 403);

  const completed = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${buyerToken}` },
  });
  assert.equal(completed.status, 200);
  assert.deepEqual(await completed.json(), {
    status: 200,
    msg: 'Pedido completado',
    data: { id: 4, status: 'COMPLETED' },
  });
});

test('responde con envelope 400 cuando el JSON está mal formado', async (t) => {
  process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';
  const app = createApp({
    getOrders: {},
    changeOrderStatus: { execute: async () => { throw new Error('No debe ejecutarse'); } },
  });
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const token = jwt.sign({ id: 12, role: 'COMPRADOR' }, process.env.JWT_SECRET);

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/orders/1/status`, {
    method: 'PATCH',
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
