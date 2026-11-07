'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { ListMyNotifications } = require('../../src/application/queries/listMyNotifications');
const { CountUnreadNotifications } = require('../../src/application/queries/countUnreadNotifications');

test('ListMyNotifications reenvia userId, role y unreadOnly al repositorio', async () => {
  let received = null;
  const notificationRepository = {
    async findMine(params) {
      received = params;
      return ['aviso-1'];
    },
  };

  const result = await new ListMyNotifications({ notificationRepository }).execute({
    userId: 12,
    role: 'COMPRADOR',
    unreadOnly: true,
  });

  assert.deepEqual(received, { userId: 12, role: 'COMPRADOR', unreadOnly: true });
  assert.deepEqual(result, ['aviso-1']);
});

test('CountUnreadNotifications reenvia userId y role al repositorio', async () => {
  let received = null;
  const notificationRepository = {
    async countUnread(params) {
      received = params;
      return 3;
    },
  };

  const result = await new CountUnreadNotifications({ notificationRepository }).execute({
    userId: 12,
    role: 'COMPRADOR',
  });

  assert.deepEqual(received, { userId: 12, role: 'COMPRADOR' });
  assert.equal(result, 3);
});
