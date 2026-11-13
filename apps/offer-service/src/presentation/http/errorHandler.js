'use strict';

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const parserStatus = error.type === 'entity.parse.failed'
    ? 400
    : error.type === 'entity.too.large'
      ? 413
      : null;
  const status = parserStatus ?? (Number.isInteger(error.statusCode) ? error.statusCode : 500);
  if (status >= 500) {
    console.error('Error en offer-service:', error);
  }
  res.status(status).json({
    status,
    msg: status >= 500
      ? 'Error interno del servidor'
      : parserStatus === 400
        ? 'El cuerpo JSON no es válido'
        : parserStatus === 413
          ? 'El cuerpo de la solicitud es demasiado grande'
          : error.message,
    data: null,
  });
}

module.exports = { errorHandler };
