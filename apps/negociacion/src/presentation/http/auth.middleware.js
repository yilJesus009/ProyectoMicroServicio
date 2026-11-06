'use strict';

const jwt = require('jsonwebtoken');

/**
 * Autenticación y autorización HTTP.
 *
 * AGENTS.md 4.5: este servicio valida la FIRMA del JWT por sí mismo con
 * JWT_SECRET. No se confía ciegamente en X-User-Id del Gateway.
 */

/** Verifica el Bearer token y deja req.user = { id, email, rol }. */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ status: 401, msg: 'Token no proporcionado', data: null });
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = {
      id: payload.user_id ?? payload.sub,
      // El claim del token manda; el header del Gateway es respaldo.
      email: payload.email ?? req.headers['x-user-email'] ?? null,
      rol: payload.rol ?? null,
    };
    if (req.user.id === undefined || req.user.id === null) {
      return res.status(401).json({ status: 401, msg: 'Token sin usuario', data: null });
    }
    next();
  } catch {
    return res.status(401).json({ status: 401, msg: 'Token inválido o expirado', data: null });
  }
}

/** Exige uno de los roles del token. Falla cerrado (403). */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.rol || !roles.includes(req.user.rol)) {
      return res.status(403).json({
        status: 403,
        msg: 'No tienes permiso para esta operación',
        data: null,
      });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
