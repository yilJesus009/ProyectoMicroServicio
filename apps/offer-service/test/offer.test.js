'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Offer } = require('../src/domain/entities/Offer');
const { AppError } = require('../src/domain/errors/AppError');
const { CreateOffer } = require('../src/application/commands/CreateOffer');
const { AcceptOffer } = require('../src/application/commands/AcceptOffer');
const { GetOffers } = require('../src/application/queries/GetOffers');

const valid = {
  requestId: 2,
  providerId: 8,
  price: '12.50',
  brand: 'Aisin',
  condition: 'NEW',
  availability: 'IN_STOCK',
  deliveryType: 'PICKUP',
  estimatedDeliveryDays: 0,
};

test('crea una oferta válida en estado SUBMITTED', () => {
  const offer = new Offer(valid);
  assert.equal(offer.status, 'SUBMITTED');
  assert.equal(offer.price, '12.50');
});

test('rechaza precios inválidos o moneda distinta de BOB', () => {
  assert.throws(() => new Offer({ ...valid, price: '0' }), AppError);
  assert.throws(() => new Offer({ ...valid, price: '1.999' }), AppError);
  assert.throws(() => new Offer({ ...valid, currency: 'USD' }), AppError);
});

test('una oferta aceptada no puede cambiar a otro estado', () => {
  const offer = new Offer({ ...valid, status: 'ACCEPTED' });
  assert.throws(() => offer.reject(), { statusCode: 409 });
});

test('no crea ofertas para solicitudes cerradas', async () => {
  const useCase = new CreateOffer({
    offerRepository: {},
    requestClient: { findById: async () => ({ status: 'ORDERED' }) },
    outboxRepository: {},
  });
  await assert.rejects(
    useCase.execute({ actor: { id: 8 }, authorization: 'Bearer x', input: { request_id: 2 } }),
    { statusCode: 422 },
  );
});

test('bloquea la aceptación del request mientras crea una oferta', async () => {
  const calls = [];
  const offerRepository = {
    transaction: (work) => work({}),
    lockRequestAcceptance: async (requestId) => calls.push(`lock:${requestId}`),
    findAcceptedByRequestId: async (requestId) => {
      calls.push(`accepted:${requestId}`);
      return null;
    },
    save: async (offer) => {
      calls.push('save');
      return { ...offer, id: 5 };
    },
  };
  const useCase = new CreateOffer({
    offerRepository,
    requestClient: { findById: async () => ({ status: 'PUBLISHED' }) },
    outboxRepository: { add: async () => {} },
  });

  await useCase.execute({
    actor: { id: 8 },
    input: {
      request_id: 2,
      price: '12.50',
      brand: 'Aisin',
      condition: 'NEW',
      availability: 'IN_STOCK',
      delivery_type: 'PICKUP',
      estimated_delivery_days: 0,
    },
  });

  assert.deepEqual(calls, ['lock:2', 'accepted:2', 'save']);
});

test('no permite ofertar en una solicitud que ya tiene aceptación registrada', async () => {
  let saved = false;
  const useCase = new CreateOffer({
    offerRepository: {
      transaction: (work) => work({}),
      lockRequestAcceptance: async () => {},
      findAcceptedByRequestId: async () => ({ id: 3 }),
      save: async () => { saved = true; },
    },
    requestClient: { findById: async () => ({ status: 'PUBLISHED' }) },
    outboxRepository: { add: async () => {} },
  });

  await assert.rejects(
    useCase.execute({
      actor: { id: 8 },
      input: {
        request_id: 2,
        price: '12.50',
        brand: 'Aisin',
        condition: 'NEW',
        availability: 'IN_STOCK',
        delivery_type: 'PICKUP',
        estimated_delivery_days: 0,
      },
    }),
    { statusCode: 422 },
  );
  assert.equal(saved, false);
});

test('mapa la colisión del índice único de aceptación a HTTP 409', async () => {
  const offer = new Offer({ ...valid, id: 1 });
  const handler = new AcceptOffer({
    offerRepository: {
      findById: async () => offer,
      transaction: (work) => work({}),
      lockRequestAcceptance: async () => {},
      findAcceptedByRequestId: async () => null,
      save: async () => {
        const error = new Error('unique violation');
        error.original = { code: '23505', constraint: 'uq_one_accepted_offer_per_request' };
        throw error;
      },
    },
    requestClient: { findById: async () => ({ status: 'PUBLISHED', user_id: 12 }) },
    outboxRepository: { add: async () => {} },
  });

  await assert.rejects(
    handler.execute({ offerId: 1, actor: { id: 12 } }),
    { statusCode: 409 },
  );
});

test('las consultas por id validan el identificador antes de tocar el repositorio', async () => {
  const getOffers = new GetOffers({
    offerRepository: { findById: async () => { throw new Error('No debe consultarse'); } },
    requestClient: {},
  });
  await assert.rejects(
    getOffers.byId({ offerId: 'abc', actor: { id: 8, roles: ['PROVEEDOR'] } }),
    { statusCode: 400 },
  );
});

test('dos aceptaciones simultáneas dejan una sola oferta aceptada y rechazan la otra', async () => {
  const offers = new Map([
    [1, new Offer({ ...valid, id: 1 })],
    [2, new Offer({ ...valid, id: 2 })],
  ]);
  let transactionTail = Promise.resolve();
  const calls = [];
  const outbox = [];
  const repository = {
    transaction(work) {
      const previous = transactionTail;
      let release;
      transactionTail = new Promise((resolve) => { release = resolve; });
      return previous.then(() => work({ LOCK: { UPDATE: 'UPDATE' } })).finally(release);
    },
    findById: async (id) => offers.get(Number(id)) || null,
    lockRequestAcceptance: async () => { calls.push('lock'); },
    findAcceptedByRequestId: async (requestId) => {
      calls.push('check');
      return [...offers.values()].find((offer) =>
        offer.requestId === requestId && offer.status === 'ACCEPTED') || null;
    },
    findSubmittedByRequestId: async (requestId) =>
      [...offers.values()].filter((offer) => offer.requestId === requestId && offer.status === 'SUBMITTED'),
    save: async (offer) => offer,
    setAcceptedOffer: async () => {},
  };
  const handler = new AcceptOffer({
    offerRepository: repository,
    requestClient: { findById: async () => ({ status: 'PUBLISHED', user_id: 12 }) },
    outboxRepository: { add: async (event) => outbox.push(event) },
  });
  const results = await Promise.allSettled([
    handler.execute({ offerId: 1, actor: { id: 12 }, authorization: 'Bearer test' }),
    handler.execute({ offerId: 2, actor: { id: 12 }, authorization: 'Bearer test' }),
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected' && result.reason.statusCode === 409).length, 1);
  assert.equal([...offers.values()].filter((offer) => offer.status === 'ACCEPTED').length, 1);
  assert.equal([...offers.values()].filter((offer) => offer.status === 'REJECTED').length, 1);
  assert.equal(outbox.filter((event) => event.routingKey === 'OFFER_ACCEPTED').length, 1);
  assert.ok(calls.indexOf('lock') < calls.indexOf('check'));
});
