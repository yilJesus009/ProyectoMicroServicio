'use strict';

const { NotificationNotFoundException, ForbiddenException } = require('../../domain/errors');

/** Caso de uso: PATCH /notifications/:id/read — solo el dueño. */
class MarkNotificationRead {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository;
  }

  /** @param {Object} params @param {number} params.id @param {number} params.userId @param {string} params.role */
  async execute({ id, userId, role }) {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) throw new NotificationNotFoundException(id);

    const isMine = notification.userId === userId || (notification.role !== null && notification.role === role);
    if (!isMine) throw new ForbiddenException('Este aviso no es tuyo');

    await this.notificationRepository.markRead(id);
    return this.notificationRepository.findById(id);
  }
}

module.exports = { MarkNotificationRead };
