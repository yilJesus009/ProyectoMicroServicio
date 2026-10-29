'use strict';

require('dotenv').config();
const { Sequelize } = require('sequelize');

/**
 * Conexión a la base PROPIA de este servicio.
 *
 * Cada microservicio tiene su PostgreSQL independiente (AGENTS.md 4.2).
 * Nunca se usan las variables de otro servicio.
 */
const sequelize = new Sequelize(
  process.env.DB_PART_REQUEST_NAME,
  process.env.DB_PART_REQUEST_USER,
  process.env.DB_PART_REQUEST_PASSWORD,
  {
    host: process.env.DB_PART_REQUEST_HOST,
    port: Number(process.env.DB_PART_REQUEST_PORT),
    dialect: 'postgres',
    logging: false,
  }
);

module.exports = sequelize;
