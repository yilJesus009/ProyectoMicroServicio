'use strict';

/**
 * Manejador global de errores.
 * Siempre responde con el envelope {status, msg, data}. Nunca expone el
 * stack trace.
 */
const ERROR_STATUS = {
  ValidationException: 400,
  ForbiddenException: 403,
  NotificationNotFoundException: 404,
};

function errorHandler(err, _req, res, _next) {
  const status = ERROR_STATUS[err.name] ?? 500;

  if (status === 500) {
    console.error('[ErrorHandler]', err);
  }

  res.status(status).json({
    status,
    msg: status === 500 ? 'Error interno del servidor' : err.message,
    data: null,
  });
}

/** 404 para rutas inexistentes, en el mismo envelope. */
function notFoundHandler(_req, res) {
  res.status(404).json({ status: 404, msg: 'Ruta no encontrada', data: null });
}

module.exports = { errorHandler, notFoundHandler };
