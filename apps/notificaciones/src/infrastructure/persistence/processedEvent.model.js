'use strict';

const { DataTypes } = require('sequelize');

/**
 * Modelo Sequelize de `processed_events` (docs/modelo-datos.md, docs/eventos.md).
 *
 * Registra el `event_id` de cada evento ya aplicado, para que el consumidor
 * descarte duplicados (RabbitMQ entrega al menos una vez). Esta fase solo
 * crea la tabla: la cola todavía no tiene bindings (fase 2).
 */
module.exports = (sequelize) =>
  sequelize.define(
    'ProcessedEvent',
    {
      eventId: { type: DataTypes.UUID, primaryKey: true, field: 'event_id' },
      eventName: { type: DataTypes.STRING, allowNull: false, field: 'event_name' },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'processed_at',
      },
    },
    {
      tableName: 'processed_events',
      timestamps: false,
      underscored: true,
    }
  );
