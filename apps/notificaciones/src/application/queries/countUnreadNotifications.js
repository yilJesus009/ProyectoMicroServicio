'use strict';

/** Query: cuántos avisos sin leer tiene el usuario (para la campanita). */
class CountUnreadNotifications {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository;
  }

  /**
   * @param {Object} params
   * @param {number} params.userId
   * @param {string} params.role
   * @returns {Promise<number>}
   */
  async execute({ userId, role }) {
    return this.notificationRepository.countUnread({ userId, role });
  }
}

module.exports = { CountUnreadNotifications };
