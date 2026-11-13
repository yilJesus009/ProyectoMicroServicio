'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OfferModel = sequelize.define('Offer', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  requestId: { type: DataTypes.BIGINT, allowNull: false, field: 'request_id' },
  providerId: { type: DataTypes.BIGINT, allowNull: false, field: 'provider_id' },
  price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'BOB' },
  brand: { type: DataTypes.STRING(120), allowNull: false },
  condition: { type: DataTypes.ENUM('NEW', 'USED', 'REFURBISHED'), allowNull: false },
  availability: { type: DataTypes.ENUM('IN_STOCK', 'ORDER_REQUIRED'), allowNull: false },
  deliveryType: { type: DataTypes.ENUM('PICKUP', 'DELIVERY'), allowNull: false, field: 'delivery_type' },
  estimatedDeliveryDays: { type: DataTypes.INTEGER, allowNull: false, field: 'estimated_delivery_days' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('SUBMITTED', 'ACCEPTED', 'REJECTED'), allowNull: false, defaultValue: 'SUBMITTED' },
}, {
  tableName: 'offers',
  timestamps: true,
});

const RequestAcceptanceModel = sequelize.define('RequestAcceptance', {
  requestId: { type: DataTypes.BIGINT, primaryKey: true, field: 'request_id' },
  acceptedOfferId: { type: DataTypes.BIGINT, allowNull: true, field: 'accepted_offer_id' },
}, { tableName: 'request_acceptances', timestamps: true });

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

module.exports = { OfferModel, RequestAcceptanceModel, OutboxEventModel };
