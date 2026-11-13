'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PartRequestHttpClient } = require('../src/infrastructure/http/PartRequestHttpClient');

test('usa la ruta legacy solo cuando la ruta versionada no está disponible', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.includes('/api/v1/part-requests/')) {
      return new Response('', { status: 404 });
    }
    return new Response(JSON.stringify({ id: 8, userId: 12, status: 'PUBLISHED' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const client = new PartRequestHttpClient({ baseUrl: 'http://part-request.test' });
    const request = await client.findById(8, 'Bearer signed-token');

    assert.equal(request.userId, 12);
    assert.equal(request.status, 'PUBLISHED');
    assert.equal(calls.length, 2);
    assert.ok(calls[1].url.endsWith('/api/requests/8'));
    assert.equal(calls[1].options.headers.authorization, 'Bearer signed-token');
  } finally {
    global.fetch = originalFetch;
  }
});

test('la ruta versionada disponible evita la llamada legacy', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    calls.push(url);
    return new Response(JSON.stringify({
      status: 200,
      msg: 'ok',
      data: { id: 8, user_id: 12, status: 'PUBLISHED' },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const client = new PartRequestHttpClient({ baseUrl: 'http://part-request.test' });
    const request = await client.findById(8);

    assert.equal(request.user_id, 12);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].endsWith('/api/v1/part-requests/8'));
  } finally {
    global.fetch = originalFetch;
  }
});
