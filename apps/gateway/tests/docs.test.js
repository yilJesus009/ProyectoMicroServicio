const assert = require('node:assert/strict');
const { once } = require('node:events');
const http = require('node:http');
const test = require('node:test');
const express = require('express');
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

/** Upstream falso: responde el mismo spec OpenAPI mínimo en cualquier ruta. */
async function createGatewayWithFakeSpec(t) {
  const fakeSpec = { openapi: '3.0.3', info: { title: 'fake' }, paths: {} };
  const upstream = express();
  upstream.get(/.*/, (_req, res) => res.json(fakeSpec));
  const upstreamServer = await listen(upstream);
  t.after(() => new Promise((resolve) => upstreamServer.close(resolve)));

  const target = getUrl(upstreamServer);
  const serviceUrls = {
    identidad: target,
    negociacion: target,
    pedidos: target,
    catalogo: target,
    notificaciones: target,
  };
  const gatewayServer = await listen(
    createApp({ serviceUrls, jwtSecret: JWT_SECRET, frontendOrigin: FRONTEND_ORIGIN })
  );
  t.after(() => new Promise((resolve) => gatewayServer.close(resolve)));

  return getUrl(gatewayServer);
}

test('/docs/catalogo.json agrega la spec interna y reescribe servers', async (t) => {
  const gatewayUrl = await createGatewayWithFakeSpec(t);

  const response = await fetch(`${gatewayUrl}/docs/catalogo.json`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.servers[0].url, gatewayUrl);
});

test('/docs/negociacion.json sin JWT y con servers apuntando a /api/v1', async (t) => {
  const gatewayUrl = await createGatewayWithFakeSpec(t);

  const response = await fetch(`${gatewayUrl}/docs/negociacion.json`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.servers[0].url, `${gatewayUrl}/api/v1`);
});

test('/docs/servicio-inexistente.json responde 404', async (t) => {
  const gatewayUrl = await createGatewayWithFakeSpec(t);

  const response = await fetch(`${gatewayUrl}/docs/no-existe.json`);
  assert.equal(response.status, 404);
});

test('/docs sirve la UI de swagger sin JWT', async (t) => {
  const gatewayUrl = await createGatewayWithFakeSpec(t);

  const response = await fetch(`${gatewayUrl}/docs/`, { redirect: 'follow' });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /swagger-ui/i);
});
