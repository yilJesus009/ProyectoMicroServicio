'use strict';

const { DataTypes } = require('sequelize');

/**
 * Modelo Sequelize de `suppliers` (docs/modelo-datos.md): copia local de
 * proveedores, alimentada por eventos de Identidad.
 *
 * `supplierId` es el `user_id` del proveedor (el mismo del JWT), PK propia
 * — no autoincremental, la asigna Identidad.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Supplier',
    {
      supplierId: { type: DataTypes.INTEGER, primaryKey: true, field: 'supplier_id' },
      businessName: { type: DataTypes.STRING, allowNull: true, field: 'business_name' },
      city: { type: DataTypes.STRING, allowNull: true, field: 'city' },
      categoryIds: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: false,
        defaultValue: [],
        field: 'category_ids',
      },
      approved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'approved' },
    },
    {
      tableName: 'suppliers',
      timestamps: true,
      createdAt: false,
      underscored: true, // updatedAt (JS) <-> updated_at (columna)
    }
  );
