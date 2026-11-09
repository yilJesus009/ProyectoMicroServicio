'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { ApplyNegotiationEvent } = require('../../src/application/commands/applyNegotiationEvent');
const { Supplier } = require('../../src/domain/entities/supplier');

/** Fakes transaccionales (mismo estilo que apps/negociacion/test/application/*.test.js). */
class FakeUnitOfWork {
  constructor(participants) {
    this.participants = participants;
  }
  async run(fn) {
    const transaction = Symbol('fake-transaction');
    try {
      const result = await fn(transaction);
      for (const p of this.participants) p.commit(transaction);
      return result;
    } catch (error) {
      for (const p of this.participants) p.rollback(transaction);
      throw error;
    }
  }
}

class FakeNotificationRepository {
  constructor() {
    this.committed = [];
    this.drafts = new Map();
  }
  async create(notification, { transaction } = {}) {
    const draft = this.drafts.get(transaction) ?? [];
    draft.push({ ...notification });
    this.drafts.set(transaction, draft);
    return notification;
  }
  commit(transaction) {
    if (this.drafts.has(transaction)) {
      this.committed.push(...this.drafts.get(transaction));
      this.drafts.delete(transaction);
    }
  }
  rollback(transaction) {
    this.drafts.delete(transaction);
  }
}

class FakeSupplierRepository {
  constructor(seed = []) {
    this.rows = new Map(seed.map((s) => [s.supplierId, { ...s }]));
  }
  async upsert(supplier) {
    this.rows.set(supplier.supplierId, { ...supplier });
  }
  async removeBySupplierId(supplierId) {
    this.rows.delete(supplierId);
  }
  async findApprovedByCityAndCategory(city, categoryId) {
    return [...this.rows.values()]
      .filter((r) => r.approved && r.city.toLowerCase() === city.toLowerCase() && r.categoryIds.includes(categoryId))
      .map((r) => new Supplier(r));
  }
  commit() {}
  rollback() {}
}

class FakeProcessedEventRepository {
  constructor() {
    this.processed = new Set();
    this.drafts = new Map();
  }
  async isProcessed(eventId, { transaction } = {}) {
    if (transaction && this.drafts.get(transaction)?.has(eventId)) return true;
    return this.processed.has(eventId);
  }
  async markProcessed(eventId, _eventName, { transaction } = {}) {
    const draft = this.drafts.get(transaction) ?? new Set();
    draft.add(eventId);
    this.drafts.set(transaction, draft);
  }
  commit(transaction) {
    if (this.drafts.has(transaction)) {
      for (const id of this.drafts.get(transaction)) this.processed.add(id);
      this.drafts.delete(transaction);
    }
  }
  rollback(transaction) {
    this.drafts.delete(transaction);
  }
}

function buildEnv(supplierSeed = []) {
  const notificationRepository = new FakeNotificationRepository();
  const supplierRepository = new FakeSupplierRepository(supplierSeed);
  const processedEventRepository = new FakeProcessedEventRepository();
  const unitOfWork = new FakeUnitOfWork([notificationRepository, supplierRepository, processedEventRepository]);
  const command = new ApplyNegotiationEvent({
    notificationRepository,
    supplierRepository,
    processedEventRepository,
    unitOfWork,
  });
  return { command, notificationRepository, supplierRepository, processedEventRepository };
}

function envelope(eventName, payload, eventId = 'evt-1') {
  return { event_id: eventId, event_name: eventName, payload };
}

test('SUPPLIER_APPROVED: aprueba en la copia local y avisa al proveedor', async () => {
  const { command, notificationRepository, supplierRepository } = buildEnv();

  await command.execute(
    envelope('SUPPLIER_APPROVED', { supplier_id: 55, business_name: 'AutoParts', city: 'Santa Cruz', category_ids: [1] })
  );

  assert.equal(supplierRepository.rows.get(55).approved, true);
  assert.equal(notificationRepository.committed.length, 1);
  assert.equal(notificationRepository.committed[0].userId, 55);
});

test('SUPPLIER_REJECTED: quita de la copia local y avisa al proveedor', async () => {
  const { command, notificationRepository, supplierRepository } = buildEnv([
    { supplierId: 55, city: 'Santa Cruz', categoryIds: [1], approved: true },
  ]);

  await command.execute(envelope('SUPPLIER_REJECTED', { supplier_id: 55, reason: 'Datos incompletos' }));

  assert.equal(supplierRepository.rows.has(55), false);
  assert.equal(notificationRepository.committed.length, 1);
});

test('PART_REQUEST_CREATED: avisa solo a los proveedores aprobados de esa categoria y ciudad', async () => {
  const { command, notificationRepository } = buildEnv([
    { supplierId: 1, city: 'Santa Cruz', categoryIds: [1, 2], approved: true }, // coincide
    { supplierId: 2, city: 'Santa Cruz', categoryIds: [3], approved: true }, // otra categoria
    { supplierId: 3, city: 'La Paz', categoryIds: [1], approved: true }, // otra ciudad
    { supplierId: 4, city: 'Santa Cruz', categoryIds: [1], approved: false }, // no aprobado
  ]);

  await command.execute(
    envelope('PART_REQUEST_CREATED', {
      part_request_id: 34,
      buyer_id: 7,
      category_id: 1,
      category_name: 'Frenos',
      vehicle_label: 'Toyota Corolla 2018',
      city: 'Santa Cruz',
    })
  );

  assert.equal(notificationRepository.committed.length, 1);
  assert.equal(notificationRepository.committed[0].userId, 1);
  assert.equal(notificationRepository.committed[0].message, 'Nueva solicitud: Frenos para Toyota Corolla 2018');
  assert.equal(notificationRepository.committed[0].link, '/proveedor/solicitudes/34/ofertar');
});

test('PART_REQUEST_CREATED: la ciudad no distingue mayusculas', async () => {
  const { command, notificationRepository } = buildEnv([
    { supplierId: 1, city: 'Santa Cruz', categoryIds: [1], approved: true },
  ]);

  await command.execute(
    envelope('PART_REQUEST_CREATED', {
      part_request_id: 34,
      category_id: 1,
      category_name: 'Frenos',
      vehicle_label: 'Toyota Corolla 2018',
      city: 'santa cruz',
    })
  );

  assert.equal(notificationRepository.committed.length, 1);
});

test('OFFER_SUBMITTED: avisa al comprador con el mensaje concreto', async () => {
  const { command, notificationRepository } = buildEnv();

  await command.execute(
    envelope('OFFER_SUBMITTED', {
      offer_id: 78,
      part_request_id: 34,
      buyer_id: 7,
      supplier_id: 55,
      supplier_name: 'AutoParts Center',
      price: 620,
      currency: 'BOB',
    })
  );

  assert.equal(notificationRepository.committed[0].userId, 7);
  assert.equal(notificationRepository.committed[0].message, 'Nueva oferta de AutoParts Center: 620 BOB');
});

test('OFFER_ACCEPTED avisa al ganador, OFFER_REJECTED avisa al no elegido', async () => {
  const envA = buildEnv();
  await envA.command.execute(
    envelope('OFFER_ACCEPTED', { offer_id: 78, part_request_id: 34, buyer_id: 7, supplier_id: 55, price: 620, currency: 'BOB' })
  );
  assert.equal(envA.notificationRepository.committed[0].userId, 55);

  const envB = buildEnv();
  await envB.command.execute(
    envelope('OFFER_REJECTED', { offer_id: 79, part_request_id: 34, supplier_id: 60, reason: 'NOT_SELECTED' })
  );
  assert.equal(envB.notificationRepository.committed[0].userId, 60);
});

test('el mismo event_id aplicado dos veces no duplica el aviso (idempotencia)', async () => {
  const { command, notificationRepository } = buildEnv();
  const msg = envelope('SUPPLIER_APPROVED', { supplier_id: 55, business_name: 'X', city: 'LP', category_ids: [1] });

  const first = await command.execute(msg);
  const second = await command.execute(msg);

  assert.equal(first.applied, true);
  assert.equal(second.applied, false);
  assert.equal(notificationRepository.committed.length, 1);
});
