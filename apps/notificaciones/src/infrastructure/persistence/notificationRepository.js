'use strict';

const { Op } = require('sequelize');
const { INotificationRepository } = require('../../domain/repositories/notificationRepository');
const { Notification } = require('../../domain/entities/notification');

/** Implementación Sequelize del contrato INotificationRepository. */
class SequelizeNotificationRepository extends INotificationRepository {
  constructor(notificationModel) {
    super();
    this.model = notificationModel;
  }

  static toEntity(row) {
    if (!row) return null;
    const r = row.get ? row.get({ plain: true }) : row;
    return new Notification({
      id: r.id,
      userId: r.userId,
      role: r.role,
      type: r.type,
      title: r.title,
      message: r.message,
      link: r.link,
      readAt: r.readAt,
      createdAt: r.createdAt,
    });
  }

  /** Avisos dirigidos a este usuario o a su rol. */
  static destinatarioWhere(userId, role) {
    return { [Op.or]: [{ userId }, { role }] };
  }

  /** Del más nuevo al más viejo, máximo 50 (ajuste del equipo, 2026-11-09). */
  async findMine({ userId, role, unreadOnly = false }) {
    const where = SequelizeNotificationRepository.destinatarioWhere(userId, role);
    if (unreadOnly) where.readAt = null;

    const rows = await this.model.findAll({ where, order: [['createdAt', 'DESC']], limit: 50 });
    return rows.map(SequelizeNotificationRepository.toEntity);
  }

  async countUnread({ userId, role }) {
    return this.model.count({
      where: { ...SequelizeNotificationRepository.destinatarioWhere(userId, role), readAt: null },
    });
  }

  async create(notification, { transaction } = {}) {
    const created = await this.model.create(
      {
        userId: notification.userId,
        role: notification.role,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
      },
      { transaction }
    );
    return SequelizeNotificationRepository.toEntity(created);
  }

  async findById(id) {
    const row = await this.model.findByPk(id);
    return SequelizeNotificationRepository.toEntity(row);
  }

  async markRead(id) {
    const [affected] = await this.model.update({ readAt: new Date() }, { where: { id, readAt: null } });
    return affected > 0;
  }

  async markAllRead({ userId, role }) {
    const [affected] = await this.model.update(
      { readAt: new Date() },
      { where: { ...SequelizeNotificationRepository.destinatarioWhere(userId, role), readAt: null } }
    );
    return affected;
  }
}

module.exports = { SequelizeNotificationRepository };
