'use strict';

const { DataTypes } = require('sequelize');

/**
 * Modelo Sequelize de `suppliers` (docs/modelo-datos.md): copia local,
 * alimentada por SUPPLIER_APPROVED/SUPPLIER_REJECTED. Sin consumidor
 * todavía (fase 2): por ahora la tabla existe pero queda vacía.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Supplier',
    {
      supplierId: { type: DataTypes.INTEGER, primaryKey: true, field: 'supplier_id' },
      city: { type: DataTypes.STRING, allowNull: false, field: 'city' },
      categoryIds: { type: DataTypes.ARRAY(DataTypes.INTEGER), allowNull: false, field: 'category_ids' },
      approved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'approved' },
    },
    {
      tableName: 'suppliers',
      timestamps: false,
      underscored: true,
    }
  );
