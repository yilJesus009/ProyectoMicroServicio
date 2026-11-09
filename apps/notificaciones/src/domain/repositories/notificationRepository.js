'use strict';

/**
 * Contrato del repositorio.
 *
 * Interfaz, NO implementación: el dominio no sabe que hay Sequelize detrás.
 * La implementación vive en infrastructure/persistence/.
 */
class INotificationRepository {
  /**
   * Avisos dirigidos al usuario o a su rol (docs/contratos-api.md).
   * @param {Object} params
   * @param {number} params.userId
   * @param {string} params.role
   * @param {boolean} [params.unreadOnly]
   * @returns {Promise<import('../entities/notification').Notification[]>}
   */
  async findMine({ userId, role, unreadOnly = false }) {
    throw new Error('not implemented');
  }

  /** @returns {Promise<number>} */
  async countUnread({ userId, role }) {
    throw new Error('not implemented');
  }

  /** @param {Object} [options] @param {unknown} [options.transaction] */
  async create(notification, options = {}) {
    throw new Error('not implemented');
  }

  async findById(id) {
    throw new Error('not implemented');
  }

  /** @returns {Promise<boolean>} true si marcó algo */
  async markRead(id) {
    throw new Error('not implemented');
  }

  async markAllRead({ userId, role }) {
    throw new Error('not implemented');
  }
}

module.exports = { INotificationRepository };
