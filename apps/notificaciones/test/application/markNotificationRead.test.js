'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { MarkNotificationRead } = require('../../src/application/commands/markNotificationRead');
const { MarkAllNotificationsRead } = require('../../src/application/commands/markAllNotificationsRead');
const { Notification } = require('../../src/domain/entities/notification');

class FakeNotificationRepository {
  constructor(rows = []) {
    this.rows = new Map(rows.map((r) => [r.id, { ...r }]));
  }
  async findById(id) {
    const row = this.rows.get(id);
    return row ? new Notification({ ...row }) : null;
  }
  async markRead(id) {
    const row = this.rows.get(id);
    if (!row || row.readAt) return false;
    row.readAt = new Date();
    return true;
  }
  async markAllRead({ userId, role }) {
    let count = 0;
    for (const row of this.rows.values()) {
      if (!row.readAt && (row.userId === userId || row.role === role)) {
        row.readAt = new Date();
        count += 1;
      }
    }
    return count;
  }
}

test('MarkNotificationRead: el dueño por userId puede marcarlo', async () => {
  const repo = new FakeNotificationRepository([{ id: 1, userId: 7, role: null, type: 'X', title: 't', message: 'm' }]);
  const command = new MarkNotificationRead({ notificationRepository: repo });

  const result = await command.execute({ id: 1, userId: 7, role: 'COMPRADOR' });
  assert.equal(result.isRead, true);
});

test('MarkNotificationRead: un aviso dirigido a mi ROL tambien se puede marcar', async () => {
  const repo = new FakeNotificationRepository([{ id: 1, userId: null, role: 'ADMIN', type: 'X', title: 't', message: 'm' }]);
  const command = new MarkNotificationRead({ notificationRepository: repo });

  const result = await command.execute({ id: 1, userId: 99, role: 'ADMIN' });
  assert.equal(result.isRead, true);
});

test('MarkNotificationRead: no es mio → ForbiddenException (403)', async () => {
  const repo = new FakeNotificationRepository([{ id: 1, userId: 7, role: null, type: 'X', title: 't', message: 'm' }]);
  const command = new MarkNotificationRead({ notificationRepository: repo });

  await assert.rejects(command.execute({ id: 1, userId: 999, role: 'COMPRADOR' }), (err) => {
    assert.equal(err.name, 'ForbiddenException');
    return true;
  });
});

test('MarkNotificationRead: no existe → NotificationNotFoundException (404)', async () => {
  const repo = new FakeNotificationRepository([]);
  const command = new MarkNotificationRead({ notificationRepository: repo });

  await assert.rejects(command.execute({ id: 999, userId: 7, role: 'COMPRADOR' }), (err) => {
    assert.equal(err.name, 'NotificationNotFoundException');
    return true;
  });
});

test('MarkAllNotificationsRead: marca los propios y los de mi rol, no los ajenos', async () => {
  const repo = new FakeNotificationRepository([
    { id: 1, userId: 7, role: null, type: 'X', title: 't', message: 'm' },
    { id: 2, userId: null, role: 'ADMIN', type: 'X', title: 't', message: 'm' },
    { id: 3, userId: 999, role: null, type: 'X', title: 't', message: 'm' },
  ]);
  const command = new MarkAllNotificationsRead({ notificationRepository: repo });

  const count = await command.execute({ userId: 7, role: 'ADMIN' });
  assert.equal(count, 2);
});
