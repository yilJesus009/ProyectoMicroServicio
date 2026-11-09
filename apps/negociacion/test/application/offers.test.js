'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { PartRequest } = require('../../src/domain/entities/partRequest');
const { Offer } = require('../../src/domain/entities/offer');
const { SubmitOffer } = require('../../src/application/commands/submitOffer');
const { WithdrawOffer } = require('../../src/application/commands/withdrawOffer');
const { AcceptOffer } = require('../../src/application/commands/acceptOffer');
const { ListPartRequestOffers } = require('../../src/application/queries/listPartRequestOffers');
const { ListMyOffers } = require('../../src/application/queries/listMyOffers');
const { Topic, PartRequestEvent, OfferEvent } = require('../../src/application/contracts');

/** Mismo estilo transaccional que test/application/useCases.test.js. */
class TransactionalRepo {
  constructor(seed = [], Entity) {
    this.Entity = Entity;
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
    return row ? new this.Entity({ ...row }) : null;
  }

  async lockById(id, { transaction } = {}) {
    return this.findById(id, { transaction });
  }

  async save(entity, { transaction } = {}) {
    const rows = this._rowsFor(transaction);
    if (entity.id == null) {
      entity.id = this.nextId++;
      rows.push({ ...entity });
      return new this.Entity({ ...entity });
    }
    const idx = rows.findIndex((r) => r.id === entity.id);
    if (idx >= 0) rows[idx] = { ...entity };
    return new this.Entity({ ...entity });
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

class FakeOfferRepository extends TransactionalRepo {
  constructor(seed = []) {
    super(seed, Offer);
  }

  async findActiveBySupplierAndRequest(supplierId, partRequestId, { transaction } = {}) {
    return (
      this._rowsFor(transaction).find(
        (r) => r.supplierId === supplierId && r.partRequestId === partRequestId && r.status === 'SUBMITTED'
      ) ?? null
    );
  }

  async findAcceptedByPartRequestId(partRequestId, { transaction } = {}) {
    const row = this._rowsFor(transaction).find((r) => r.partRequestId === partRequestId && r.status === 'ACCEPTED');
    return row ? new Offer({ ...row }) : null;
  }

  async findByPartRequestId(partRequestId) {
    return this.committedRows.filter((r) => r.partRequestId === partRequestId).map((r) => new Offer({ ...r }));
  }

  async findBySupplierId(supplierId) {
    return this.committedRows.filter((r) => r.supplierId === supplierId).map((r) => new Offer({ ...r }));
  }

  async rejectOthersSubmitted(partRequestId, acceptedOfferId, { transaction } = {}) {
    const rows = this._rowsFor(transaction);
    const rejected = [];
    for (const row of rows) {
      if (row.partRequestId === partRequestId && row.status === 'SUBMITTED' && row.id !== acceptedOfferId) {
        row.status = 'REJECTED';
        rejected.push(new Offer({ ...row }));
      }
    }
    return rejected;
  }
}

class FakeSupplierRepository {
  constructor(suppliers = {}) {
    this.suppliers = suppliers; // { [id]: { approved, businessName } }
  }
  async findBySupplierId(id) {
    return this.suppliers[id] ?? null;
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

const BUYER_ID = 7;
const SUPPLIER_A = 55;
const SUPPLIER_B = 60;
const PRODUCER = 'negociacion';

function seedRequest(overrides = {}) {
  return new PartRequest({
    id: 34,
    userId: BUYER_ID,
    userEmail: 'juan@taller.com',
    categoryId: 1,
    categoryName: 'Frenos',
    vehicleBrand: 'Toyota',
    vehicleModel: 'Corolla',
    vehicleYear: 2018,
    description: 'Pastillas de freno delanteras',
    city: 'Santa Cruz',
    status: 'PUBLISHED',
    ...overrides,
  });
}

function seedOffer(overrides = {}) {
  return new Offer({
    id: 78,
    partRequestId: 34,
    supplierId: SUPPLIER_A,
    supplierName: 'AutoParts Center',
    price: 620,
    brand: 'KYB',
    condition: 'NEW',
    availability: 'IN_STOCK',
    deliveryType: 'DELIVERY',
    estimatedDays: 2,
    status: 'SUBMITTED',
    ...overrides,
  });
}

function buildEnv(requestSeed = [], offerSeed = [], suppliers = { [SUPPLIER_A]: { approved: true, businessName: 'AutoParts Center' } }) {
  const partRequestRepository = new TransactionalRepo(requestSeed.length ? requestSeed : [seedRequest()], PartRequest);
  const offerRepository = new FakeOfferRepository(offerSeed);
  const supplierRepository = new FakeSupplierRepository(suppliers);
  const outboxRepository = new FakeOutboxRepository();
  const unitOfWork = new FakeUnitOfWork([partRequestRepository, offerRepository, outboxRepository]);
  return { partRequestRepository, offerRepository, supplierRepository, outboxRepository, unitOfWork };
}

// ---------------------------------------------------------------------------
// SubmitOffer
// ---------------------------------------------------------------------------

test('SubmitOffer: primera oferta pasa la solicitud a RECEIVING_OFFERS y encola ambos eventos', async () => {
  const env = buildEnv();
  const command = new SubmitOffer({ ...env, producer: PRODUCER });

  const offer = await command.execute({
    partRequestId: 34,
    supplierId: SUPPLIER_A,
    data: { price: 620, brand: 'KYB', condition: 'NEW', availability: 'IN_STOCK', deliveryType: 'DELIVERY', estimatedDays: 2 },
  });

  assert.equal(offer.status, 'SUBMITTED');
  assert.equal(offer.supplierName, 'AutoParts Center', 'el nombre sale de la copia local, no del body');

  const request = await env.partRequestRepository.findById(34);
  assert.equal(request.status, 'RECEIVING_OFFERS');

  const names = env.outboxRepository.committed.map((e) => e.event_name);
  assert.deepEqual(names.sort(), [OfferEvent.SUBMITTED, PartRequestEvent.STATUS_CHANGED].sort());
});

test('SubmitOffer: la segunda oferta de otro proveedor NO vuelve a publicar PART_REQUEST_STATUS_CHANGED', async () => {
  const env = buildEnv([seedRequest({ status: 'RECEIVING_OFFERS' })]);
  env.supplierRepository.suppliers[SUPPLIER_B] = { approved: true, businessName: 'Repuestos B' };
  const command = new SubmitOffer({ ...env, producer: PRODUCER });

  await command.execute({
    partRequestId: 34,
    supplierId: SUPPLIER_B,
    data: { price: 500, brand: 'X', condition: 'USED', availability: 'ON_ORDER', deliveryType: 'PICKUP', estimatedDays: 1 },
  });

  const names = env.outboxRepository.committed.map((e) => e.event_name);
  assert.deepEqual(names, [OfferEvent.SUBMITTED]);
});

test('SubmitOffer: proveedor no aprobado → ForbiddenException (403)', async () => {
  const env = buildEnv([], [], { [SUPPLIER_A]: { approved: false, businessName: 'X' } });
  const command = new SubmitOffer({ ...env, producer: PRODUCER });

  await assert.rejects(
    command.execute({ partRequestId: 34, supplierId: SUPPLIER_A, data: { price: 10, brand: 'X', condition: 'NEW', availability: 'IN_STOCK', deliveryType: 'PICKUP', estimatedDays: 1 } }),
    (err) => {
      assert.equal(err.name, 'ForbiddenException');
      return true;
    }
  );
});

test('SubmitOffer: solicitud CANCELLED → PartRequestNotAcceptingOffersException (422)', async () => {
  const env = buildEnv([seedRequest({ status: 'CANCELLED' })]);
  const command = new SubmitOffer({ ...env, producer: PRODUCER });

  await assert.rejects(
    command.execute({ partRequestId: 34, supplierId: SUPPLIER_A, data: { price: 10, brand: 'X', condition: 'NEW', availability: 'IN_STOCK', deliveryType: 'PICKUP', estimatedDays: 1 } }),
    (err) => {
      assert.equal(err.name, 'PartRequestNotAcceptingOffersException');
      return true;
    }
  );
});

test('SubmitOffer: ya tiene una oferta activa ahi → ActiveOfferConflictException (409)', async () => {
  const env = buildEnv([seedRequest({ status: 'RECEIVING_OFFERS' })], [seedOffer()]);
  const command = new SubmitOffer({ ...env, producer: PRODUCER });

  await assert.rejects(
    command.execute({ partRequestId: 34, supplierId: SUPPLIER_A, data: { price: 10, brand: 'X', condition: 'NEW', availability: 'IN_STOCK', deliveryType: 'PICKUP', estimatedDays: 1 } }),
    (err) => {
      assert.equal(err.name, 'ActiveOfferConflictException');
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// WithdrawOffer
// ---------------------------------------------------------------------------

test('WithdrawOffer: el dueño retira su oferta SUBMITTED', async () => {
  const env = buildEnv([seedRequest({ status: 'RECEIVING_OFFERS' })], [seedOffer()]);
  const command = new WithdrawOffer(env);

  const offer = await command.execute({ offerId: 78, actorId: SUPPLIER_A });
  assert.equal(offer.status, 'WITHDRAWN');
});

test('WithdrawOffer: quien no es el dueño de la oferta → ForbiddenException (403)', async () => {
  const env = buildEnv([seedRequest({ status: 'RECEIVING_OFFERS' })], [seedOffer()]);
  const command = new WithdrawOffer(env);

  await assert.rejects(command.execute({ offerId: 78, actorId: 999 }), (err) => {
    assert.equal(err.name, 'ForbiddenException');
    return true;
  });
});

test('WithdrawOffer: la solicitud ya no esta abierta (OFFER_ACCEPTED) → PartRequestNotAcceptingOffersException (422)', async () => {
  const env = buildEnv([seedRequest({ status: 'OFFER_ACCEPTED' })], [seedOffer()]);
  const command = new WithdrawOffer(env);

  await assert.rejects(command.execute({ offerId: 78, actorId: SUPPLIER_A }), (err) => {
    assert.equal(err.name, 'PartRequestNotAcceptingOffersException');
    return true;
  });
});

test('WithdrawOffer: la oferta ya no esta SUBMITTED (ya retirada) → InvalidOfferTransitionException (422)', async () => {
  const env = buildEnv([seedRequest({ status: 'RECEIVING_OFFERS' })], [seedOffer({ status: 'WITHDRAWN' })]);
  const command = new WithdrawOffer(env);

  await assert.rejects(command.execute({ offerId: 78, actorId: SUPPLIER_A }), (err) => {
    assert.equal(err.name, 'InvalidOfferTransitionException');
    return true;
  });
});

test('WithdrawOffer: oferta inexistente → OfferNotFoundException (404)', async () => {
  const env = buildEnv();
  const command = new WithdrawOffer(env);

  await assert.rejects(command.execute({ offerId: 999, actorId: SUPPLIER_A }), (err) => {
    assert.equal(err.name, 'OfferNotFoundException');
    return true;
  });
});

// ---------------------------------------------------------------------------
// AcceptOffer — la regla critica
// ---------------------------------------------------------------------------

function buildTwoOfferScenario() {
  const offerA = seedOffer({ id: 78, supplierId: SUPPLIER_A, price: 620 });
  const offerB = seedOffer({ id: 79, supplierId: SUPPLIER_B, price: 700 });
  return buildEnv([seedRequest({ status: 'RECEIVING_OFFERS' })], [offerA, offerB]);
}

test('AcceptOffer: acepta una oferta, rechaza las demas y la solicitud queda OFFER_ACCEPTED', async () => {
  const env = buildTwoOfferScenario();
  const command = new AcceptOffer({ ...env, producer: PRODUCER });

  const { offer, partRequest } = await command.execute({ offerId: 78, actorId: BUYER_ID });

  assert.equal(offer.status, 'ACCEPTED');
  assert.equal(partRequest.status, 'OFFER_ACCEPTED');

  const rival = await env.offerRepository.findById(79);
  assert.equal(rival.status, 'REJECTED');
});

test('AcceptOffer: encola OFFER_ACCEPTED con todos los campos del contrato, OFFER_REJECTED y PART_REQUEST_STATUS_CHANGED', async () => {
  const env = buildTwoOfferScenario();
  const command = new AcceptOffer({ ...env, producer: PRODUCER });

  await command.execute({ offerId: 78, actorId: BUYER_ID, correlationId: 'corr-accept' });

  const byName = Object.fromEntries(env.outboxRepository.committed.map((e) => [e.event_name, e]));

  assert.deepEqual(byName[OfferEvent.ACCEPTED]._exchange, Topic.OFFER);
  assert.deepEqual(byName[OfferEvent.ACCEPTED].payload, {
    offer_id: 78,
    part_request_id: 34,
    buyer_id: BUYER_ID,
    supplier_id: SUPPLIER_A,
    supplier_name: 'AutoParts Center',
    price: 620,
    currency: 'BOB',
    delivery_type: 'DELIVERY',
    estimated_days: 2,
    part_description: 'Pastillas de freno delanteras',
    vehicle_label: 'Toyota Corolla 2018',
  });

  assert.deepEqual(byName[OfferEvent.REJECTED].payload, {
    offer_id: 79,
    part_request_id: 34,
    supplier_id: SUPPLIER_B,
    reason: 'NOT_SELECTED',
  });

  assert.deepEqual(byName[PartRequestEvent.STATUS_CHANGED].payload, {
    part_request_id: 34,
    previous_status: 'RECEIVING_OFFERS',
    new_status: 'OFFER_ACCEPTED',
  });
});

test('AcceptOffer: la SEGUNDA aceptacion da 409, no 422 (orden de las verificaciones)', async () => {
  const env = buildTwoOfferScenario();
  const command = new AcceptOffer({ ...env, producer: PRODUCER });

  await command.execute({ offerId: 78, actorId: BUYER_ID }); // primera: gana

  await assert.rejects(command.execute({ offerId: 79, actorId: BUYER_ID }), (err) => {
    assert.equal(err.name, 'OfferAlreadyAcceptedException');
    return true;
  });
});

test('AcceptOffer: quien no es el dueño de la solicitud → ForbiddenException (403)', async () => {
  const env = buildTwoOfferScenario();
  const command = new AcceptOffer({ ...env, producer: PRODUCER });

  await assert.rejects(command.execute({ offerId: 78, actorId: 999 }), (err) => {
    assert.equal(err.name, 'ForbiddenException');
    return true;
  });
});

test('AcceptOffer: oferta ya retirada → InvalidOfferTransitionException (422)', async () => {
  const env = buildEnv([seedRequest({ status: 'RECEIVING_OFFERS' })], [seedOffer({ status: 'WITHDRAWN' })]);
  const command = new AcceptOffer({ ...env, producer: PRODUCER });

  await assert.rejects(command.execute({ offerId: 78, actorId: BUYER_ID }), (err) => {
    assert.equal(err.name, 'InvalidOfferTransitionException');
    return true;
  });
});

test('AcceptOffer: solicitud CANCELLED (sin ninguna aceptada todavia) → InvalidPartRequestTransitionException (422)', async () => {
  const env = buildEnv([seedRequest({ status: 'CANCELLED' })], [seedOffer()]);
  const command = new AcceptOffer({ ...env, producer: PRODUCER });

  await assert.rejects(command.execute({ offerId: 78, actorId: BUYER_ID }), (err) => {
    assert.equal(err.name, 'InvalidPartRequestTransitionException');
    return true;
  });
});

test('AcceptOffer: oferta inexistente → OfferNotFoundException (404)', async () => {
  const env = buildEnv();
  const command = new AcceptOffer({ ...env, producer: PRODUCER });

  await assert.rejects(command.execute({ offerId: 999, actorId: BUYER_ID }), (err) => {
    assert.equal(err.name, 'OfferNotFoundException');
    return true;
  });
});

test('AcceptOffer: un unique_violation de Postgres (red de seguridad) se traduce a 409, no a 500', async () => {
  const env = buildTwoOfferScenario();
  const realSave = env.offerRepository.save.bind(env.offerRepository);
  let call = 0;
  env.offerRepository.save = async (offer, opts) => {
    call += 1;
    if (call === 1) {
      const pgError = new Error('duplicate key value violates unique constraint "uq_one_accepted_offer"');
      pgError.original = { code: '23505' };
      throw pgError;
    }
    return realSave(offer, opts);
  };
  const command = new AcceptOffer({ ...env, producer: PRODUCER });

  await assert.rejects(command.execute({ offerId: 78, actorId: BUYER_ID }), (err) => {
    assert.equal(err.name, 'OfferAlreadyAcceptedException');
    return true;
  });
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

test('ListPartRequestOffers: el dueño ve el comparador', async () => {
  const env = buildTwoOfferScenario();
  const query = new ListPartRequestOffers(env);

  const offers = await query.execute(34, BUYER_ID);
  assert.equal(offers.length, 2);
});

test('ListPartRequestOffers: quien no es el dueño → ForbiddenException (403)', async () => {
  const env = buildTwoOfferScenario();
  const query = new ListPartRequestOffers(env);

  await assert.rejects(query.execute(34, 999), (err) => {
    assert.equal(err.name, 'ForbiddenException');
    return true;
  });
});

test('ListMyOffers: devuelve las ofertas del proveedor', async () => {
  const env = buildTwoOfferScenario();
  const query = new ListMyOffers(env);

  const offers = await query.execute(SUPPLIER_A);
  assert.equal(offers.length, 1);
  assert.equal(offers[0].supplierId, SUPPLIER_A);
});
