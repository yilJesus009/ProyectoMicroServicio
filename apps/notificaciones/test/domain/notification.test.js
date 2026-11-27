'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { Notification } = require('../../src/domain/entities/notification');

test('una notificacion sin readAt no esta leida', () => {
  const n = new Notification({ type: 'OFFER_SUBMITTED', title: 't', message: 'm' });
  assert.equal(n.isRead, false);
});

test('una notificacion con readAt esta leida', () => {
  const n = new Notification({ type: 'OFFER_SUBMITTED', title: 't', message: 'm', readAt: new Date() });
  assert.equal(n.isRead, true);
});
