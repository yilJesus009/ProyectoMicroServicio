'use strict';

const { DataTypes } = require('sequelize');
const { PartRequestStatus, Urgency } = require('../../domain/enums');

/**
 * Modelo Sequelize (adaptador de persistencia).
 *
 * - snake_case en la base (`field` + `underscored: true`)
 * - camelCase en la API/dominio
 * - Enums en inglés según docs/contratos-api.md
 */
module.exports = (sequelize) =>
  sequelize.define(
    'PartRequest',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
      userEmail: { type: DataTypes.STRING, allowNull: true, field: 'user_email' },
      vehicleBrand: { type: DataTypes.STRING, allowNull: false, field: 'vehicle_brand' },
      vehicleModel: { type: DataTypes.STRING, allowNull: false, field: 'vehicle_model' },
      vehicleYear: { type: DataTypes.INTEGER, allowNull: false, field: 'vehicle_year' },
      description: { type: DataTypes.TEXT, allowNull: false, field: 'description' },
      city: { type: DataTypes.STRING, allowNull: false, field: 'city' },
      urgency: {
        type: DataTypes.ENUM(...Object.values(Urgency)),
        allowNull: false,
        defaultValue: Urgency.MEDIA,
        field: 'urgency',
      },
      status: {
        type: DataTypes.ENUM(...Object.values(PartRequestStatus)),
        allowNull: false,
        defaultValue: PartRequestStatus.PUBLISHED,
        field: 'status',
      },
      photo: { type: DataTypes.STRING, allowNull: true, field: 'photo' },
    },
    {
      tableName: 'part_requests',
      timestamps: true,
      underscored: true,
    }
  );
