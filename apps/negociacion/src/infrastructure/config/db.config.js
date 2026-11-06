'use strict';

require('dotenv').config();
const { Sequelize } = require('sequelize');

/**
 * Conexión al PostgreSQL compartido ("repuestosya"), esquema propio.
 *
 * Un solo servidor, un esquema y un usuario por servicio (AGENTS.md §5):
 * `define: { schema: 'negociacion' }` hace que Sequelize cualifique cada
 * tabla como `negociacion.<tabla>`. Nunca se usan las variables de otro
 * servicio.
 */
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_NEGOCIACION_USER,
  process.env.DB_NEGOCIACION_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: 'postgres',
    logging: false,
    define: { schema: 'negociacion' },
  }
);

module.exports = sequelize;
