'use strict';

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_OFFER_NAME,
  process.env.DB_OFFER_USER,
  process.env.DB_OFFER_PASSWORD,
  {
    host: process.env.DB_OFFER_HOST,
    port: process.env.DB_OFFER_PORT ? Number(process.env.DB_OFFER_PORT) : undefined,
    dialect: 'postgres',
    logging: false,
    define: { underscored: true },
  },
);

module.exports = { sequelize };
