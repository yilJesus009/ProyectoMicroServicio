'use strict';

/**
 * Roles de usuario.
 *
 * Definidos en el Identity Service y usados por todos los servicios
 * para la autorización. El Gateway los reparte como header `X-User-Roles`.
 */
const Role = Object.freeze({
  COMPRADOR: 'COMPRADOR',   // Publica solicitudes y acepta ofertas
  PROVEEDOR: 'PROVEEDOR',   // Envía ofertas y prepara pedidos
  ADMIN:     'ADMIN',       // Administración
});

const ALL_ROLES = Object.freeze(Object.values(Role));

module.exports = { Role, ALL_ROLES };
