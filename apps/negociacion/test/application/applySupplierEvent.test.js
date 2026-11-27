'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { ApplySupplierEvent } = require('../../src/application/commands/applySupplierEvent');
const { SupplierEvent } = require('../../src/application/contracts');

/** Fakes transaccionales mínimos (mismo estilo que useCases.test.js). */
class FakeUnitOfWork {
  async run(fn) {
    const transaction = Symbol('fake-transaction');
    return fn(transaction);
  }
}

class FakeSupplierRepository {
  constructor() {
    this.rows = new Map();
  }
  async upsert(supplier) {
    this.rows.set(supplier.supplierId, supplier);
  }
  async removeBySupplierId(supplierId) {
    this.rows.delete(supplierId);
  }
}

class FakeProcessedEventRepository {
  constructor() {
    this.processed = new Set();
  }
  async isProcessed(eventId) {
    return this.processed.has(eventId);
  }
  async markProcessed(eventId) {
    this.processed.add(eventId);
  }
}

function buildUseCase() {
  const supplierRepository = new FakeSupplierRepository();
  const processedEventRepository = new FakeProcessedEventRepository();
  const useCase = new ApplySupplierEvent({
    supplierRepository,
    processedEventRepository,
    unitOfWork: new FakeUnitOfWork(),
  });
  return { useCase, supplierRepository, processedEventRepository };
}

function envelope(eventName, payload, eventId = 'evt-1') {
  return { event_id: eventId, event_name: eventName, payload };
}

test('SUPPLIER_APPROVED deja al proveedor aprobado con ciudad y categorias', async () => {
  const { useCase, supplierRepository } = buildUseCase();

  await useCase.execute(
    envelope(SupplierEvent.APPROVED, {
      supplier_id: 55,
      business_name: 'AutoParts Center',
      city: 'Santa Cruz',
      category_ids: [1, 3],
    })
  );

  const row = supplierRepository.rows.get(55);
  assert.equal(row.approved, true);
  assert.equal(row.city, 'Santa Cruz');
  assert.deepEqual(row.categoryIds, [1, 3]);
});

test('SUPPLIER_PROFILE_SUBMITTED deja al proveedor sin aprobar, aunque ya estuviera aprobado antes', async () => {
  const { useCase, supplierRepository } = buildUseCase();

  await useCase.execute(
    envelope(
      SupplierEvent.APPROVED,
      { supplier_id: 55, business_name: 'AutoParts Center', city: 'Santa Cruz', category_ids: [1] },
      'evt-1'
    )
  );
  assert.equal(supplierRepository.rows.get(55).approved, true);

  await useCase.execute(
    envelope(SupplierEvent.PROFILE_SUBMITTED, { supplier_id: 55, business_name: 'AutoParts Center' }, 'evt-2')
  );

  assert.equal(supplierRepository.rows.get(55).approved, false);
});

test('SUPPLIER_REJECTED quita al proveedor de la copia local', async () => {
  const { useCase, supplierRepository } = buildUseCase();

  await useCase.execute(
    envelope(SupplierEvent.APPROVED, { supplier_id: 55, business_name: 'X', city: 'LP', category_ids: [] }, 'evt-1')
  );
  assert.ok(supplierRepository.rows.has(55));

  await useCase.execute(
    envelope(SupplierEvent.REJECTED, { supplier_id: 55, reason: 'Datos incompletos' }, 'evt-2')
  );

  assert.equal(supplierRepository.rows.has(55), false);
});

test('el mismo event_id aplicado dos veces no duplica el efecto (idempotencia)', async () => {
  const { useCase, supplierRepository } = buildUseCase();
  const msg = envelope(SupplierEvent.APPROVED, {
    supplier_id: 55,
    business_name: 'AutoParts Center',
    city: 'Santa Cruz',
    category_ids: [1],
  });

  const first = await useCase.execute(msg);
  const second = await useCase.execute(msg); // duplicado, mismo event_id

  assert.equal(first.applied, true);
  assert.equal(second.applied, false);
  assert.equal(supplierRepository.rows.size, 1);
});
