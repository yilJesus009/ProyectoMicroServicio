'use strict';

/** Entidad de dominio. Sin imports de Sequelize (AGENTS.md §7). */
class Notification {
  constructor({
    id = null,
    userId = null,
    role = null,
    type,
    title,
    message,
    link = null,
    readAt = null,
    createdAt = null,
  }) {
    this.id = id;
    this.userId = userId;
    this.role = role;
    this.type = type;
    this.title = title;
    this.message = message;
    this.link = link;
    this.readAt = readAt;
    this.createdAt = createdAt;
  }

  get isRead() {
    return this.readAt !== null;
  }
}

module.exports = { Notification };
