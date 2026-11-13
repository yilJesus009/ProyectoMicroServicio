'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_OFFER_NAME ||= 'offer_test';
process.env.DB_OFFER_USER ||= 'offer_test';
process.env.DB_OFFER_PASSWORD ||= 'offer_test';
process.env.DB_OFFER_HOST ||= 'localhost';

const { OutboxEventModel } = require('../src/infrastructure/persistence/models');
const { OutboxRepository } = require('../src/infrastructure/persistence/OutboxRepository');

test('mantiene eventos fallidos en el outbox y vuelve a publicarlos al recuperarse RabbitMQ', async (t) => {
  const originalTransaction = OutboxEventModel.sequelize.transaction;
  const originalFindAll = OutboxEventModel.findAll;
  const event = {
    attempts: 0,
    publishedAt: null,
    update: async function update(values) {
      Object.assign(this, values);
      return this;
    },
  };
  OutboxEventModel.sequelize.transaction = async (work) => work({ LOCK: { UPDATE: 'UPDATE' } });
  OutboxEventModel.findAll = async () => [event];
  t.after(() => {
    OutboxEventModel.sequelize.transaction = originalTransaction;
    OutboxEventModel.findAll = originalFindAll;
  });

  const repository = new OutboxRepository();
  await repository.dispatchBatch({
    publish: async () => { throw new Error('broker unavailable'); },
  }, { error() {} });
  assert.equal(event.attempts, 1);
  assert.equal(event.publishedAt, null);
  assert.ok(event.nextAttemptAt instanceof Date);

  event.nextAttemptAt = new Date(0);
  let published = false;
  await repository.dispatchBatch({
    publish: async () => { published = true; },
  });
  assert.equal(published, true);
  assert.ok(event.publishedAt instanceof Date);
});
