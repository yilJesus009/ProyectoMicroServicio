'use strict';

const jwt = require('jsonwebtoken');
const { newId } = require('@repuestos/shared');
const { AppError } = require('../../domain/errors/AppError');

function authenticate(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return next(new AppError('Se requiere un token Bearer válido', 401, 'UNAUTHORIZED'));
  }
  try {
    const claims = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
    const id = Number(claims.id ?? claims.user_id ?? claims.userId ?? claims.sub);
    const rawRoles = claims.roles ?? claims.role ?? claims.rol;
    const roles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles])
      .filter(Boolean)
      .map((role) => String(role).toUpperCase());
    if (!Number.isSafeInteger(id) || id <= 0 || !roles.length) {
      throw new Error('JWT no contiene identidad o rol válidos');
    }
    req.user = { id, roles };
    req.correlationId = req.get('X-Correlation-Id') || newId();
    next();
  } catch {
    next(new AppError('El token es inválido o expiró', 401, 'UNAUTHORIZED'));
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user?.roles.some((role) => allowedRoles.includes(role))) {
      return next(new AppError('No tienes permiso para esta operación', 403, 'FORBIDDEN'));
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
