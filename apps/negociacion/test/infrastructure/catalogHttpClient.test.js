'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { CatalogHttpClient } = require('../../src/infrastructure/http/catalogHttpClient');

function withFakeFetch(fakeImpl, run) {
  const original = global.fetch;
  global.fetch = fakeImpl;
  return run().finally(() => {
    global.fetch = original;
  });
}

test('findById devuelve la categoria cuando Catalogo responde 200', async () => {
  const client = new CatalogHttpClient({ baseUrl: 'http://catalogo:4004' });

  await withFakeFetch(
    async (url, options) => {
      assert.equal(url, 'http://catalogo:4004/api/v1/categories/1');
      assert.equal(options.headers.Authorization, 'Bearer jwt-123');
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: 200, msg: 'ok', data: { id: 1, name: 'Frenos', active: true } }),
      };
    },
    async () => {
      const category = await client.findById(1, 'jwt-123');
      assert.deepEqual(category, { id: 1, name: 'Frenos', active: true });
    }
  );
});

test('findById lanza CategoryNotFoundException (400) si Catalogo responde 404', async () => {
  const client = new CatalogHttpClient({ baseUrl: 'http://catalogo:4004' });

  await withFakeFetch(
    async () => ({ ok: false, status: 404, json: async () => ({ data: null }) }),
    async () => {
      await assert.rejects(client.findById(999, 'jwt-123'), (err) => {
        assert.equal(err.name, 'CategoryNotFoundException');
        return true;
      });
    }
  );
});

test('findById lanza CatalogUnavailableException (503) si la conexion falla', async () => {
  const client = new CatalogHttpClient({ baseUrl: 'http://catalogo:4004' });

  await withFakeFetch(
    async () => {
      throw new Error('ECONNREFUSED');
    },
    async () => {
      await assert.rejects(client.findById(1, 'jwt-123'), (err) => {
        assert.equal(err.name, 'CatalogUnavailableException');
        return true;
      });
    }
  );
});

test('findById lanza CatalogUnavailableException (503) si Catalogo responde 500', async () => {
  const client = new CatalogHttpClient({ baseUrl: 'http://catalogo:4004' });

  await withFakeFetch(
    async () => ({ ok: false, status: 500, json: async () => ({ data: null }) }),
    async () => {
      await assert.rejects(client.findById(1, 'jwt-123'), (err) => {
        assert.equal(err.name, 'CatalogUnavailableException');
        return true;
      });
    }
  );
});
