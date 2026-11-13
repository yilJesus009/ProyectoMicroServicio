'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Order } = require('../src/domain/entities/Order');
const { ProcessOfferAccepted } = require('../src/application/commands/ProcessOfferAccepted');
const { ChangeOrderStatus } = require('../src/application/commands/ChangeOrderStatus');

const payload = {
  offer_id: 78,
  request_id: 34,
  provider_id: 55,
  buyer_id: 12,
  price: '1250.50',
  currency: 'BOB',
  brand: 'Aisin',
  condition: 'NEW',
  availability: 'IN_STOCK',
  delivery_type: 'DELIVERY',
  estimated_delivery_days: 3,
};

const event = {
  event_name: 'OFFER_ACCEPTED',
  occurred_at: '2026-11-06T00:00:00.000Z',
  correlation_id: 'trace-1',
  producer: 'offer-service',
  payload,
};

test('el pedido conserva una instantánea del precio y condiciones aceptadas', () => {
  const order = new Order({
    requestId: 34,
    offerId: 78,
    buyerId: 12,
    providerId: 55,
    price: '1250.50',
    currency: 'BOB',
    brand: 'Aisin',
    condition: 'NEW',
    availability: 'IN_STOCK',
    deliveryType: 'DELIVERY',
    estimatedDeliveryDays: 3,
  });
  assert.equal(order.price, '1250.50');
  assert.equal(order.brand, 'Aisin');
  assert.equal(order.status, 'PENDING');
});

test('rechaza transiciones no permitidas y permite la transición normal', () => {
  const order = new Order({
    requestId: 34, offerId: 78, buyerId: 12, providerId: 55,
    price: '10', currency: 'BOB', brand: 'A', condition: 'NEW',
    availability: 'IN_STOCK', deliveryType: 'PICKUP', estimatedDeliveryDays: 0,
  });
  assert.throws(() => order.changeStatus('SHIPPED'), { statusCode: 422 });
  assert.equal(order.changeStatus('PREPARING'), 'PENDING');
});

test('distingue la entrega a domicilio del retiro en tienda', () => {
  const deliveryOrder = new Order({
    requestId: 34, offerId: 78, buyerId: 12, providerId: 55,
    price: '10', currency: 'BOB', brand: 'A', condition: 'NEW',
    availability: 'IN_STOCK', deliveryType: 'DELIVERY', estimatedDeliveryDays: 0,
  });
  deliveryOrder.changeStatus('PREPARING');
  deliveryOrder.changeStatus('SHIPPED');
  assert.throws(() => deliveryOrder.changeStatus('READY_FOR_PICKUP'), { statusCode: 422 });

  const pickupOrder = new Order({
    requestId: 34, offerId: 79, buyerId: 12, providerId: 55,
    price: '10', currency: 'BOB', brand: 'A', condition: 'NEW',
    availability: 'IN_STOCK', deliveryType: 'PICKUP', estimatedDeliveryDays: 0,
  });
  pickupOrder.changeStatus('PREPARING');
  pickupOrder.changeStatus('READY_FOR_PICKUP');
  pickupOrder.changeStatus('DELIVERED');
  assert.equal(pickupOrder.status, 'DELIVERED');
});

test('procesa OFFER_ACCEPTED una sola vez y genera un único pedido', async () => {
  const orders = [];
  const processed = new Set();
  const outbox = [];
  const repository = {
    transaction: (work) => work({}),
    wasProcessed: async (key) => processed.has(key),
    findByOfferId: async (id) => orders.find((order) => order.offerId === Number(id)) || null,
    save: async (order) => {
      const saved = { ...order, id: orders.length + 1 };
      orders.push(saved);
      return saved;
    },
    markProcessed: async (key) => processed.add(key),
  };
  const outboxRepository = { add: async (event) => outbox.push(event) };
  const handler = new ProcessOfferAccepted({ orderRepository: repository, outboxRepository });

  const first = await handler.execute(event);
  const second = await handler.execute(event);
  const redeliveredWithNewEnvelope = await handler.execute({
    ...event,
    occurred_at: '2026-11-06T00:01:00.000Z',
    correlation_id: 'trace-2',
  });

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(redeliveredWithNewEnvelope.duplicate, true);
  assert.equal(orders.length, 1);
  assert.equal(outbox.length, 1);
});

test('solo el comprador confirma el retiro y solo el proveedor marca READY_FOR_PICKUP', async () => {
  const order = new Order({
    id: 1, requestId: 34, offerId: 79, buyerId: 12, providerId: 55,
    price: '10', currency: 'BOB', brand: 'A', condition: 'NEW',
    availability: 'IN_STOCK', deliveryType: 'PICKUP', estimatedDeliveryDays: 0,
    status: 'PREPARING',
  });
  const handler = new ChangeOrderStatus({
    orderRepository: {
      transaction: (work) => work({}),
      findById: async () => order,
      save: async (value) => value,
    },
    outboxRepository: { add: async () => {} },
  });
  await assert.rejects(
    handler.execute({
      orderId: 1, actor: { id: 12, roles: ['COMPRADOR'] }, nextStatus: 'READY_FOR_PICKUP',
    }),
    { statusCode: 403 },
  );
  await handler.execute({
    orderId: 1, actor: { id: 55, roles: ['PROVEEDOR'] }, nextStatus: 'READY_FOR_PICKUP',
  });
  await assert.rejects(
    handler.execute({
      orderId: 1, actor: { id: 55, roles: ['PROVEEDOR'] }, nextStatus: 'DELIVERED',
    }),
    { statusCode: 403 },
  );
  await handler.execute({
    orderId: 1, actor: { id: 12, roles: ['COMPRADOR'] }, nextStatus: 'DELIVERED',
  });
  assert.equal(order.status, 'DELIVERED');
});

test('rechaza un cambio de estado por un usuario ajeno al pedido', async () => {
  const order = new Order({
    id: 1, requestId: 34, offerId: 79, buyerId: 12, providerId: 55,
    price: '10', currency: 'BOB', brand: 'A', condition: 'NEW',
    availability: 'IN_STOCK', deliveryType: 'DELIVERY', estimatedDeliveryDays: 0,
  });
  const handler = new ChangeOrderStatus({
    orderRepository: {
      transaction: (work) => work({}),
      findById: async () => order,
    },
    outboxRepository: { add: async () => {} },
  });

  await assert.rejects(
    handler.execute({
      orderId: 1, actor: { id: 99, roles: ['PROVEEDOR'] }, nextStatus: 'PREPARING',
    }),
    { statusCode: 403 },
  );
  assert.equal(order.status, 'PENDING');
});

test('rechaza eventos de aceptación con envelope incompleto', async () => {
  const handler = new ProcessOfferAccepted({
    orderRepository: {},
    outboxRepository: {},
  });
  await assert.rejects(
    handler.execute({ event_name: 'OFFER_ACCEPTED', payload }),
    { statusCode: 400 },
  );
});
