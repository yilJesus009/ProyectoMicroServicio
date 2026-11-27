'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { ListMyPartRequests } = require('../../src/application/queries/listMyPartRequests');
const { ListOpenPartRequests } = require('../../src/application/queries/listOpenPartRequests');

/** Fake mínimo: refleja los filtros que de verdad usa SequelizePartRequestRepository.findAll. */
class FakePartRequestRepository {
  constructor(rows = []) {
    this.rows = rows;
    this.lastFilters = null;
  }

  async findAll(filters = {}) {
    this.lastFilters = filters;
    return this.rows.filter((r) => {
      if (filters.userId !== undefined && r.userId !== filters.userId) return false;
      if (filters.statuses && !filters.statuses.includes(r.status)) return false;
      if (filters.categoryId !== undefined && r.categoryId !== filters.categoryId) return false;
      if (filters.city && r.city.toLowerCase() !== filters.city.toLowerCase()) return false;
      return true;
    });
  }
}

class FakeSupplierRepository {
  constructor(suppliers = {}) {
    this.suppliers = suppliers;
  }

  async findBySupplierId(supplierId) {
    return this.suppliers[supplierId] ?? null;
  }
}

test('ListMyPartRequests filtra por el dueño autenticado', async () => {
  const repo = new FakePartRequestRepository([{ id: 1, userId: 7, status: 'PUBLISHED', categoryId: 1, city: 'La Paz' }]);
  const query = new ListMyPartRequests({ partRequestRepository: repo });

  await query.execute(7);
  assert.deepEqual(repo.lastFilters, { userId: 7 });
});

test('ListOpenPartRequests: proveedor no aprobado → ForbiddenException (403)', async () => {
  const query = new ListOpenPartRequests({
    partRequestRepository: new FakePartRequestRepository(),
    supplierRepository: new FakeSupplierRepository({ 55: { approved: false } }),
  });

  await assert.rejects(query.execute(55), (err) => {
    assert.equal(err.name, 'ForbiddenException');
    return true;
  });
});

test('ListOpenPartRequests: proveedor aprobado solo ve PUBLISHED o RECEIVING_OFFERS', async () => {
  const repo = new FakePartRequestRepository([
    { id: 1, userId: 7, status: 'PUBLISHED', categoryId: 1, city: 'La Paz' },
    { id: 2, userId: 7, status: 'RECEIVING_OFFERS', categoryId: 1, city: 'La Paz' },
    { id: 3, userId: 7, status: 'OFFER_ACCEPTED', categoryId: 1, city: 'La Paz' },
  ]);
  const query = new ListOpenPartRequests({
    partRequestRepository: repo,
    supplierRepository: new FakeSupplierRepository({ 55: { approved: true } }),
  });

  const result = await query.execute(55);
  assert.deepEqual(result.map((r) => r.id), [1, 2]);
});

test('ListOpenPartRequests: el filtro city no distingue mayusculas', async () => {
  const repo = new FakePartRequestRepository([
    { id: 1, userId: 7, status: 'PUBLISHED', categoryId: 1, city: 'Santa Cruz' },
  ]);
  const query = new ListOpenPartRequests({
    partRequestRepository: repo,
    supplierRepository: new FakeSupplierRepository({ 55: { approved: true } }),
  });

  const result = await query.execute(55, { city: 'santa cruz' });
  assert.equal(result.length, 1);
  assert.equal(repo.lastFilters.city, 'santa cruz'); // el repo real usa Op.iLike, acá solo se verifica que viaja el filtro
});
