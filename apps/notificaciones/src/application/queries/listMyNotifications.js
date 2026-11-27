'use strict';

/** Query: avisos del usuario, incluidos los dirigidos a su rol. Solo lee. */
class ListMyNotifications {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository;
  }

  /**
   * @param {Object} params
   * @param {number} params.userId
   * @param {string} params.role
   * @param {boolean} [params.unreadOnly]
   */
  async execute({ userId, role, unreadOnly = false }) {
    return this.notificationRepository.findMine({ userId, role, unreadOnly });
  }
}

module.exports = { ListMyNotifications };
