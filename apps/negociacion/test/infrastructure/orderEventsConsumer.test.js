'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { handleRawMessage } = require('../../src/infrastructure/messaging/orderEventsConsumer');

test('un evento sin event_id se descarta (nack → dlq) sin llamar a applyOrderStatusChanged', async () => {
  let called = false;
  const fakeApply = { execute: async () => { called = true; } };

  const raw = Buffer.from(JSON.stringify({ event_name: 'ORDER_STATUS_CHANGED', payload: {} }));
  const result = await handleRawMessage(raw, fakeApply);

  assert.equal(result.action, 'nack');
  assert.equal(called, false, 'no debe tocar la logica de aplicacion');
});

test('un mensaje que no es JSON valido se descarta (nack → dlq)', async () => {
  const fakeApply = { execute: async () => {} };
  const result = await handleRawMessage(Buffer.from('esto no es json'), fakeApply);
  assert.equal(result.action, 'nack');
});

test('un evento con event_id se aplica y se confirma (ack)', async () => {
  let receivedEnvelope = null;
  const fakeApply = {
    execute: async (envelope) => {
      receivedEnvelope = envelope;
      return { applied: true };
    },
  };

  const raw = Buffer.from(
    JSON.stringify({ event_id: 'evt-1', event_name: 'ORDER_STATUS_CHANGED', payload: { part_request_id: 34, new_status: 'COMPLETED' } })
  );
  const result = await handleRawMessage(raw, fakeApply);

  assert.equal(result.action, 'ack');
  assert.equal(receivedEnvelope.event_id, 'evt-1');
});

test('si applyOrderStatusChanged lanza, el mensaje se descarta (nack → dlq)', async () => {
  const fakeApply = {
    execute: async () => {
      throw new Error('fallo simulado');
    },
  };

  const raw = Buffer.from(JSON.stringify({ event_id: 'evt-1', event_name: 'ORDER_STATUS_CHANGED', payload: {} }));
  const result = await handleRawMessage(raw, fakeApply);

  assert.equal(result.action, 'nack');
});
