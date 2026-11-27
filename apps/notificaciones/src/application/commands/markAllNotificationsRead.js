'use strict';

/** Caso de uso: PATCH /notifications/read-all. */
class MarkAllNotificationsRead {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository;
  }

  /** @param {Object} params @param {number} params.userId @param {string} params.role @returns {Promise<number>} cuántos se marcaron */
  async execute({ userId, role }) {
    return this.notificationRepository.markAllRead({ userId, role });
  }
}

module.exports = { MarkAllNotificationsRead };
