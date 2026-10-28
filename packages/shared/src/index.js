'use strict';

/**
 * Punto de entrada de @repuestos/shared.
 *
 * Solo tipos, enums y contratos. NUNCA lógica de negocio:
 * cada servicio debe poder evolucionar su dominio sin romper a otro.
 */

const roles = require('./enums/roles');
const status = require('./enums/status');
const events = require('./events');

module.exports = {
  ...roles,
  ...status,
  ...events,
};
