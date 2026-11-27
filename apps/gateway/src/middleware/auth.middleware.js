const jwt = require('jsonwebtoken');

const IDENTITY_HEADERS = [
  'x-user-id',
  'x-user-roles',
  'x-user-email',
];

function clearIdentityHeaders(req, res, next) {
  for (const header of IDENTITY_HEADERS) {
    delete req.headers[header];
  }
  next();
}

function getIdentity(payload) {
  const userId = payload.user_id ?? payload.userId ?? payload.id ?? payload.sub;
  const roles = payload.rol ?? payload.role ?? payload.roles;
  const email = payload.email;

  if (
    (typeof userId !== 'string' && typeof userId !== 'number') ||
    String(userId).length === 0 ||
    (typeof roles !== 'string' &&
      !(Array.isArray(roles) && roles.every((role) => typeof role === 'string')))
  ) {
    return null;
  }

  return {
    id: String(userId),
    roles: Array.isArray(roles) ? roles.join(',') : roles,
    email: typeof email === 'string' ? email : '',
  };
}

function createAuthMiddleware(jwtSecret) {
  if (typeof jwtSecret !== 'string' || jwtSecret.length === 0) {
    throw new Error('JWT_SECRET es obligatorio para iniciar el API Gateway');
  }

  return function authMiddleware(req, res, next) {
    const authorization = req.get('authorization');
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      return res.status(401).json({
        status: 401,
        msg: 'Se requiere un token Bearer válido',
        data: null,
      });
    }

    let payload;
    try {
      payload = jwt.verify(match[1], jwtSecret, { algorithms: ['HS256'] });
    } catch {
      return res.status(401).json({
        status: 401,
        msg: 'El token es inválido o expiró',
        data: null,
      });
    }

    const identity = getIdentity(payload);
    if (!identity) {
      return res.status(401).json({
        status: 401,
        msg: 'El token no contiene una identidad válida',
        data: null,
      });
    }

    req.user = identity;
    next();
  };
}

module.exports = { clearIdentityHeaders, createAuthMiddleware };
