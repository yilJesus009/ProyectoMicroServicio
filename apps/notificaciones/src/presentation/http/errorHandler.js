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

/**
 * Un 4xx que viene de una librería (p. ej. el `SyntaxError` de body-parser
 * ante un JSON mal formado, que trae `status: 400`) antes que el 500
 * genérico (revisión fase 5, hallazgo 2): si no, un body roto daba 500 en
 * vez del 400 que pide el contrato.
 */
function libraryStatus(err) {
  for (const candidate of [err.status, err.statusCode]) {
    if (typeof candidate === 'number' && candidate >= 400 && candidate < 500) {
      return candidate;
    }
  }
  return undefined;
}

function errorHandler(err, _req, res, _next) {
  const mapped = ERROR_STATUS[err.name];
  const status = mapped ?? libraryStatus(err) ?? 500;

  if (status === 500) {
    console.error('[ErrorHandler]', err);
  }

  let msg;
  if (mapped) {
    msg = err.message;
  } else if (status === 500) {
    msg = 'Error interno del servidor';
  } else if (err instanceof SyntaxError) {
    msg = 'El cuerpo de la petición no es JSON válido';
  } else {
    msg = 'Datos inválidos';
  }

  res.status(status).json({ status, msg, data: null });
}

/** 404 para rutas inexistentes, en el mismo envelope. */
function notFoundHandler(_req, res) {
  res.status(404).json({ status: 404, msg: 'Ruta no encontrada', data: null });
}

module.exports = { errorHandler, notFoundHandler };
