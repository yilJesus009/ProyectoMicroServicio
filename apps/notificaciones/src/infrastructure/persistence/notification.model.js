'use strict';

const { DataTypes } = require('sequelize');

/** Modelo Sequelize de `notifications` (docs/modelo-datos.md). */
module.exports = (sequelize) =>
  sequelize.define(
    'Notification',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: true, field: 'user_id' },
      role: { type: DataTypes.STRING, allowNull: true, field: 'role' },
      type: { type: DataTypes.STRING, allowNull: false, field: 'type' },
      title: { type: DataTypes.STRING, allowNull: false, field: 'title' },
      message: { type: DataTypes.TEXT, allowNull: false, field: 'message' },
      link: { type: DataTypes.STRING, allowNull: true, field: 'link' },
      readAt: { type: DataTypes.DATE, allowNull: true, field: 'read_at' },
    },
    {
      tableName: 'notifications',
      timestamps: true,
      updatedAt: false,
      underscored: true,
    }
  );
