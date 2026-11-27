'use strict';

const { DataTypes } = require('sequelize');
const { OfferStatus, OfferCondition, OfferAvailability, DeliveryType } = require('../../domain/enums');

/**
 * Modelo Sequelize de `offers` (docs/modelo-datos.md).
 *
 * Los dos índices parciales son la capa de base de datos de la regla
 * crítica (AGENTS.md §4.1): si el lock de la solicitud y la validación de
 * dominio fallaran por algún motivo, Postgres los rechaza igual.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Offer',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      partRequestId: { type: DataTypes.INTEGER, allowNull: false, field: 'part_request_id' },
      supplierId: { type: DataTypes.INTEGER, allowNull: false, field: 'supplier_id' },
      supplierName: { type: DataTypes.STRING, allowNull: false, field: 'supplier_name' },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'BOB' },
      brand: { type: DataTypes.STRING, allowNull: false },
      condition: { type: DataTypes.ENUM(...Object.values(OfferCondition)), allowNull: false },
      availability: { type: DataTypes.ENUM(...Object.values(OfferAvailability)), allowNull: false },
      deliveryType: {
        type: DataTypes.ENUM(...Object.values(DeliveryType)),
        allowNull: false,
        field: 'delivery_type',
      },
      estimatedDays: { type: DataTypes.INTEGER, allowNull: false, field: 'estimated_days' },
      notes: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM(...Object.values(OfferStatus)),
        allowNull: false,
        defaultValue: OfferStatus.SUBMITTED,
      },
    },
    {
      tableName: 'offers',
      timestamps: true,
      underscored: true,
      indexes: [
        // La regla principal: una sola oferta aceptada por solicitud.
        {
          name: 'uq_one_accepted_offer',
          unique: true,
          fields: ['part_request_id'],
          where: { status: OfferStatus.ACCEPTED },
        },
        // Una oferta activa por proveedor y solicitud.
        {
          name: 'uq_one_active_offer_per_supplier',
          unique: true,
          fields: ['part_request_id', 'supplier_id'],
          where: { status: OfferStatus.SUBMITTED },
        },
      ],
    }
  );
