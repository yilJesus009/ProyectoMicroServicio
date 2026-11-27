'use strict';

const { DataTypes } = require('sequelize');

/**
 * Modelo Sequelize de `outbox_events` (docs/modelo-datos.md, docs/eventos.md).
 *
 * `id` es el mismo `event_id` del sobre: es la llave de idempotencia que
 * usan los consumidores. `payload` guarda el sobre COMPLETO (event_id,
 * event_name, version, occurred_at, correlation_id, producer, payload),
 * no solo los datos del hecho.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'OutboxEvent',
    {
      id: { type: DataTypes.UUID, primaryKey: true },
      exchange: { type: DataTypes.STRING, allowNull: false },
      routingKey: { type: DataTypes.STRING, allowNull: false, field: 'routing_key' },
      payload: { type: DataTypes.JSONB, allowNull: false },
      publishedAt: { type: DataTypes.DATE, allowNull: true, field: 'published_at' },
      attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'outbox_events',
      timestamps: true,
      updatedAt: false,
      underscored: true, // createdAt (JS) <-> created_at (columna)
    }
  );
