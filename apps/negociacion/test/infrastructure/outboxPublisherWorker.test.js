'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { startOutboxPublisherWorker } = require('../../src/infrastructure/messaging/outboxPublisherWorker');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Outbox falso: ya trae los pendientes fijos, en orden de creación. */
function makeOutboxRepository(pending) {
  return {
    calls: { findUnpublished: 0, markPublished: [], incrementAttempts: [] },
    async findUnpublished() {
      this.calls.findUnpublished += 1;
      return this.calls.findUnpublished === 1 ? pending : [];
    },
    async markPublished(id) {
      this.calls.markPublished.push(id);
    },
    async incrementAttempts(id) {
      this.calls.incrementAttempts.push(id);
    },
  };
}

test('publica los pendientes en orden de creación y marca published_at', async () => {
  const order = [];
  const pending = [
    { id: 'evt-1', exchange: 'part_request_events', routingKey: 'PART_REQUEST_CREATED', payload: { event_name: 'PART_REQUEST_CREATED' } },
    { id: 'evt-2', exchange: 'part_request_events', routingKey: 'PART_REQUEST_STATUS_CHANGED', payload: { event_name: 'PART_REQUEST_STATUS_CHANGED' } },
  ];
  const outboxRepository = makeOutboxRepository(pending);
  const eventPublisher = {
    async publishConfirmed(exchange, routingKey, envelope) {
      order.push(`publish:${envelope.event_name}`);
    },
  };
  const realMarkPublished = outboxRepository.markPublished.bind(outboxRepository);
  outboxRepository.markPublished = async (id) => {
    order.push(`marked:${id}`);
    return realMarkPublished(id);
  };

  const worker = startOutboxPublisherWorker({ outboxRepository, eventPublisher, intervalMs: 5 });
  try {
    await sleep(40);
  } finally {
    worker.stop();
  }

  assert.deepEqual(order, [
    'publish:PART_REQUEST_CREATED',
    'marked:evt-1',
    'publish:PART_REQUEST_STATUS_CHANGED',
    'marked:evt-2',
  ]);
  assert.deepEqual(outboxRepository.calls.markPublished, ['evt-1', 'evt-2']);
});

test('si un evento falla, no marca published_at y suma un intento, pero sigue con los demás', async () => {
  const pending = [
    { id: 'evt-falla', exchange: 'ex', routingKey: 'rk', payload: { event_name: 'X' } },
    { id: 'evt-ok', exchange: 'ex', routingKey: 'rk', payload: { event_name: 'Y' } },
  ];
  const outboxRepository = makeOutboxRepository(pending);
  const eventPublisher = {
    async publishConfirmed(exchange, routingKey, envelope) {
      if (envelope.event_name === 'X') throw new Error('RabbitMQ no respondió');
    },
  };

  const worker = startOutboxPublisherWorker({ outboxRepository, eventPublisher, intervalMs: 5 });
  try {
    await sleep(40);
  } finally {
    worker.stop();
  }

  assert.deepEqual(outboxRepository.calls.incrementAttempts, ['evt-falla']);
  assert.deepEqual(outboxRepository.calls.markPublished, ['evt-ok']);
});

test('stop() detiene el ciclo: no sigue consultando pendientes', async () => {
  const outboxRepository = makeOutboxRepository([]);
  const eventPublisher = { async publishConfirmed() {} };

  const worker = startOutboxPublisherWorker({ outboxRepository, eventPublisher, intervalMs: 5 });
  await sleep(20);
  worker.stop();
  const callsAtStop = outboxRepository.calls.findUnpublished;
  await sleep(30);

  assert.equal(outboxRepository.calls.findUnpublished, callsAtStop, 'no hubo más ciclos después de stop()');
});
