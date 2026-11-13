'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrderModel = sequelize.define('Order', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  requestId: { type: DataTypes.BIGINT, allowNull: false, field: 'request_id' },
  offerId: { type: DataTypes.BIGINT, allowNull: false, field: 'offer_id' },
  buyerId: { type: DataTypes.BIGINT, allowNull: false, field: 'buyer_id' },
  providerId: { type: DataTypes.BIGINT, allowNull: false, field: 'provider_id' },
  price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), allowNull: false },
  brand: { type: DataTypes.STRING(120), allowNull: false },
  condition: { type: DataTypes.ENUM('NEW', 'USED', 'REFURBISHED'), allowNull: false },
  availability: { type: DataTypes.ENUM('IN_STOCK', 'ORDER_REQUIRED'), allowNull: false },
  deliveryType: { type: DataTypes.ENUM('PICKUP', 'DELIVERY'), allowNull: false, field: 'delivery_type' },
  estimatedDeliveryDays: { type: DataTypes.INTEGER, allowNull: false, field: 'estimated_delivery_days' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('PENDING', 'PREPARING', 'SHIPPED', 'READY_FOR_PICKUP', 'DELIVERED', 'COMPLETED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'PENDING',
  },
}, {
  tableName: 'orders',
  timestamps: true,
});

const ProcessedEventModel = sequelize.define('ProcessedEvent', {
  eventKey: { type: DataTypes.STRING(300), primaryKey: true, field: 'event_key' },
  correlationId: { type: DataTypes.STRING(100), allowNull: false, field: 'correlation_id' },
}, { tableName: 'processed_events', timestamps: true });

const OutboxEventModel = sequelize.define('OutboxEvent', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  topic: { type: DataTypes.STRING(100), allowNull: false },
  routingKey: { type: DataTypes.STRING(100), allowNull: false, field: 'routing_key' },
  message: { type: DataTypes.JSONB, allowNull: false },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  nextAttemptAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'next_attempt_at' },
  publishedAt: { type: DataTypes.DATE, allowNull: true, field: 'published_at' },
}, {
  tableName: 'outbox_events',
  timestamps: true,
  indexes: [{ fields: ['published_at', 'next_attempt_at'] }],
});

module.exports = { OrderModel, ProcessedEventModel, OutboxEventModel };
