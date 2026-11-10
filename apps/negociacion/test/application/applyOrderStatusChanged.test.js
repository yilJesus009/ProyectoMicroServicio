'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { PartRequest } = require('../../src/domain/entities/partRequest');
const { ApplyOrderStatusChanged } = require('../../src/application/commands/applyOrderStatusChanged');
const { PartRequestEvent } = require('../../src/application/contracts');

/** Mismo estilo transaccional que test/application/offers.test.js. */
class FakePartRequestRepository {
  constructor(seed = []) {
    this.committedRows = seed.map((r) => ({ ...r }));
    this.nextId = seed.length + 1;
    this.drafts = new Map();
  }

  _rowsFor(transaction) {
    if (!transaction) return this.committedRows;
    if (!this.drafts.has(transaction)) {
      this.drafts.set(transaction, this.committedRows.map((r) => ({ ...r })));
    }
    return this.drafts.get(transaction);
  }

  async findById(id, { transaction } = {}) {
    const row = this._rowsFor(transaction).find((r) => r.id === id);
    return row ? new PartRequest({ ...row }) : null;
  }

  async updateStatusIfCurrent(id, expectedStatus, newStatus, { transaction } = {}) {
    const rows = this._rowsFor(transaction);
    const row = rows.find((r) => r.id === id);
    if (!row || row.status !== expectedStatus) return false;
    row.status = newStatus;
    return true;
  }

  commit(transaction) {
    if (this.drafts.has(transaction)) {
      this.committedRows = this.drafts.get(transaction);
      this.drafts.delete(transaction);
    }
  }

  rollback(transaction) {
    this.drafts.delete(transaction);
  }
}

class FakeOutboxRepository {
  constructor() {
    this.committed = [];
    this.drafts = new Map();
  }
  async enqueue(envelope, { exchange, routingKey, transaction } = {}) {
    const draft = this.drafts.get(transaction) ?? [];
    draft.push({ ...envelope, _exchange: exchange, _routingKey: routingKey });
    this.drafts.set(transaction, draft);
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

function buildUseCase(seed) {
  const partRequestRepository = new FakePartRequestRepository(seed);
  const outboxRepository = new FakeOutboxRepository();
  const processedEventRepository = new FakeProcessedEventRepository();
  const useCase = new ApplyOrderStatusChanged({
    partRequestRepository,
    outboxRepository,
    processedEventRepository,
    unitOfWork: new FakeUnitOfWork([partRequestRepository, outboxRepository]),
    producer: 'negociacion',
  });
  return { useCase, partRequestRepository, outboxRepository, processedEventRepository };
}

function envelope(newStatus, eventId = 'evt-1') {
  return {
    event_id: eventId,
    event_name: 'ORDER_STATUS_CHANGED',
    correlation_id: 'corr-1',
    payload: { order_id: 12, part_request_id: 34, buyer_id: 7, supplier_id: 55, previous_status: 'DELIVERED', new_status: newStatus },
  };
}

test('new_status COMPLETED completa la solicitud y encola PART_REQUEST_STATUS_CHANGED', async () => {
  const { useCase, partRequestRepository, outboxRepository } = buildUseCase([
    { id: 34, userId: 7, categoryId: 1, categoryName: 'Frenos', vehicleBrand: 'Toyota', vehicleModel: 'Corolla', vehicleYear: 2018, description: 'x', city: 'LP', status: 'OFFER_ACCEPTED' },
  ]);

  const result = await useCase.execute(envelope('COMPLETED'));

  assert.equal(result.applied, true);
  const request = await partRequestRepository.findById(34);
  assert.equal(request.status, 'COMPLETED');
  assert.equal(outboxRepository.committed.length, 1);
  assert.equal(outboxRepository.committed[0].event_name, PartRequestEvent.STATUS_CHANGED);
  assert.equal(outboxRepository.committed[0].payload.new_status, 'COMPLETED');
});

test('new_status distinto de COMPLETED no toca la solicitud, solo marca procesado', async () => {
  const { useCase, partRequestRepository, outboxRepository } = buildUseCase([
    { id: 34, userId: 7, categoryId: 1, categoryName: 'Frenos', vehicleBrand: 'Toyota', vehicleModel: 'Corolla', vehicleYear: 2018, description: 'x', city: 'LP', status: 'OFFER_ACCEPTED' },
  ]);

  const result = await useCase.execute(envelope('IN_TRANSIT'));

  assert.equal(result.applied, true);
  const request = await partRequestRepository.findById(34);
  assert.equal(request.status, 'OFFER_ACCEPTED');
  assert.equal(outboxRepository.committed.length, 0);
});

test('el mismo event_id dos veces es idempotente', async () => {
  const { useCase, outboxRepository } = buildUseCase([
    { id: 34, userId: 7, categoryId: 1, categoryName: 'Frenos', vehicleBrand: 'Toyota', vehicleModel: 'Corolla', vehicleYear: 2018, description: 'x', city: 'LP', status: 'OFFER_ACCEPTED' },
  ]);
  const msg = envelope('COMPLETED', 'evt-dup');

  const first = await useCase.execute(msg);
  const second = await useCase.execute(msg);

  assert.equal(first.applied, true);
  assert.equal(second.applied, false);
  assert.equal(outboxRepository.committed.length, 1);
});

test('COMPLETED dos veces con event_id distinto no completa de nuevo ni republica', async () => {
  const { useCase, partRequestRepository, outboxRepository } = buildUseCase([
    { id: 34, userId: 7, categoryId: 1, categoryName: 'Frenos', vehicleBrand: 'Toyota', vehicleModel: 'Corolla', vehicleYear: 2018, description: 'x', city: 'LP', status: 'OFFER_ACCEPTED' },
  ]);

  await useCase.execute(envelope('COMPLETED', 'evt-1'));
  const second = await useCase.execute(envelope('COMPLETED', 'evt-2'));

  assert.equal(second.applied, true); // se procesó el event_id (se marcó), aunque no haya efecto
  const request = await partRequestRepository.findById(34);
  assert.equal(request.status, 'COMPLETED');
  assert.equal(outboxRepository.committed.length, 1, 'no debe publicar PART_REQUEST_STATUS_CHANGED una segunda vez');
});

test('si la solicitud esta en un estado que no puede pasar a COMPLETED, se relanza (va a la dlq)', async () => {
  const { useCase } = buildUseCase([
    { id: 34, userId: 7, categoryId: 1, categoryName: 'Frenos', vehicleBrand: 'Toyota', vehicleModel: 'Corolla', vehicleYear: 2018, description: 'x', city: 'LP', status: 'CANCELLED' },
  ]);

  await assert.rejects(() => useCase.execute(envelope('COMPLETED')));
});
