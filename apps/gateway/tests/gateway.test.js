const assert = require('node:assert/strict');
const { once } = require('node:events');
const http = require('node:http');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');

const JWT_SECRET = 'gateway-test-secret';
const FRONTEND_ORIGIN = 'http://localhost:4200';

async function listen(app) {
  const server = http.createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server;
}

function getUrl(server) {
  return `http://127.0.0.1:${server.address().port}`;
}

async function createGateway(t, upstreamHandler) {
  const upstream = express();
  upstream.use(upstreamHandler);
  const upstreamServer = await listen(upstream);
  t.after(() => new Promise((resolve) => upstreamServer.close(resolve)));

  const target = getUrl(upstreamServer);
  const serviceUrls = {
    identity: target,
    partRequest: target,
    offer: target,
    order: target,
    catalog: target,
    notification: target,
  };
  const gatewayServer = await listen(
    createApp({
      serviceUrls,
      jwtSecret: JWT_SECRET,
      frontendOrigin: FRONTEND_ORIGIN,
    })
  );
  t.after(() => new Promise((resolve) => gatewayServer.close(resolve)));

  return getUrl(gatewayServer);
}

function tokenFor(
  payload = { user_id: 42, rol: 'COMPRADOR', email: 'buyer@example.com' }
) {
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

test('health responde con el envelope del proyecto', async (t) => {
  const gatewayUrl = await createGateway(t, (_req, res) => res.end());

  const response = await fetch(`${gatewayUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 200,
    msg: 'API Gateway disponible',
    data: { service: 'api-gateway' },
  });
});

test('rechaza solicitudes protegidas sin JWT', async (t) => {
  let upstreamCalled = false;
  const gatewayUrl = await createGateway(t, (_req, res) => {
    upstreamCalled = true;
    res.end();
  });

  const response = await fetch(`${gatewayUrl}/api/v1/orders`);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).status, 401);
  assert.equal(upstreamCalled, false);
});

test('rechaza tokens inválidos antes de contactar al servicio', async (t) => {
  let upstreamCalled = false;
  const gatewayUrl = await createGateway(t, (_req, res) => {
    upstreamCalled = true;
    res.end();
  });

  const response = await fetch(`${gatewayUrl}/api/v1/orders`, {
    headers: { Authorization: 'Bearer token-invalido' },
  });

  assert.equal(response.status, 401);
  assert.equal(upstreamCalled, false);
});

test('valida JWT y reemplaza headers de identidad antes de proxyear', async (t) => {
  const gatewayUrl = await createGateway(t, (req, res) => {
    res.json({
      path: req.url,
      userId: req.headers['x-user-id'],
      roles: req.headers['x-user-roles'],
      email: req.headers['x-user-email'],
      correlationId: req.headers['x-correlation-id'],
    });
  });

  const response = await fetch(
    `${gatewayUrl}/api/v1/part-requests?status=PUBLISHED`,
    {
      headers: {
        Authorization: `Bearer ${tokenFor()}`,
        'X-User-Id': '999',
        'X-User-Roles': 'ADMIN',
        'X-User-Email': 'attacker@example.com',
      },
    }
  );

  assert.equal(response.status, 200);
  const forwarded = await response.json();
  assert.equal(forwarded.path, '/api/v1/part-requests?status=PUBLISHED');
  assert.equal(forwarded.userId, '42');
  assert.equal(forwarded.roles, 'COMPRADOR');
  assert.equal(forwarded.email, 'buyer@example.com');
  assert.match(forwarded.correlationId, /^[0-9a-f-]{36}$/i);
});

test('permite preflight CORS solo desde el frontend configurado', async (t) => {
  const gatewayUrl = await createGateway(t, (_req, res) => res.end());

  const response = await fetch(`${gatewayUrl}/api/v1/orders`, {
    method: 'OPTIONS',
    headers: {
      Origin: FRONTEND_ORIGIN,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization',
    },
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), FRONTEND_ORIGIN);
});

test('registro público conserva el body y descarta headers de identidad falsificados', async (t) => {
  const gatewayUrl = await createGateway(t, (req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      res.json({
        path: req.url,
        body: Buffer.concat(chunks).toString(),
        userId: req.headers['x-user-id'] ?? null,
      });
    });
  });

  const body = JSON.stringify({ email: 'new@example.com', rol: 'COMPRADOR' });
  const response = await fetch(`${gatewayUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': '999',
    },
    body,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    path: '/api/v1/auth/register',
    body,
    userId: null,
  });
});