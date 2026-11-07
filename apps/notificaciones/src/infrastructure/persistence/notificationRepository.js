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

  async findMine({ userId, role, unreadOnly = false }) {
    const where = SequelizeNotificationRepository.destinatarioWhere(userId, role);
    if (unreadOnly) where.readAt = null;

    const rows = await this.model.findAll({ where, order: [['createdAt', 'DESC']] });
    return rows.map(SequelizeNotificationRepository.toEntity);
  }

  async countUnread({ userId, role }) {
    return this.model.count({
      where: { ...SequelizeNotificationRepository.destinatarioWhere(userId, role), readAt: null },
    });
  }
}

module.exports = { SequelizeNotificationRepository };
