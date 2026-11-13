'use strict';

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_ORDER_NAME,
  process.env.DB_ORDER_USER,
  process.env.DB_ORDER_PASSWORD,
  {
    host: process.env.DB_ORDER_HOST,
    port: process.env.DB_ORDER_PORT ? Number(process.env.DB_ORDER_PORT) : undefined,
    dialect: 'postgres',
    logging: false,
    define: { underscored: true },
  },
);

module.exports = { sequelize };
