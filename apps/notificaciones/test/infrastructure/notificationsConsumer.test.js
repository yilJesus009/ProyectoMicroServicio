'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { handleRawMessage } = require('../../src/infrastructure/messaging/notificationsConsumer');

test('un evento sin event_id se descarta (nack → dlq) sin llamar a applyNegotiationEvent', async () => {
  let called = false;
  const fakeApply = { execute: async () => { called = true; } };

  const raw = Buffer.from(JSON.stringify({ event_name: 'OFFER_SUBMITTED', payload: {} }));
  const result = await handleRawMessage(raw, fakeApply);

  assert.equal(result.action, 'nack');
  assert.equal(called, false);
});

test('un mensaje que no es JSON valido se descarta (nack → dlq)', async () => {
  const result = await handleRawMessage(Buffer.from('no es json'), { execute: async () => {} });
  assert.equal(result.action, 'nack');
});

test('un evento con event_id se aplica y se confirma (ack)', async () => {
  let received = null;
  const fakeApply = { execute: async (envelope) => { received = envelope; return { applied: true }; } };

  const raw = Buffer.from(JSON.stringify({ event_id: 'evt-1', event_name: 'OFFER_SUBMITTED', payload: {} }));
  const result = await handleRawMessage(raw, fakeApply);

  assert.equal(result.action, 'ack');
  assert.equal(received.event_id, 'evt-1');
});

test('si applyNegotiationEvent lanza, el mensaje se descarta (nack → dlq)', async () => {
  const fakeApply = { execute: async () => { throw new Error('fallo simulado'); } };
  const raw = Buffer.from(JSON.stringify({ event_id: 'evt-1', event_name: 'OFFER_SUBMITTED', payload: {} }));

  const result = await handleRawMessage(raw, fakeApply);
  assert.equal(result.action, 'nack');
});
