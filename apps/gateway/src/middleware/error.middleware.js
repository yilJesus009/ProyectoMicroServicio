function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  console.error('Error interno en API Gateway:', err);
  return res.status(500).json({
    status: 500,
    msg: 'Error interno del servidor',
    data: null,
  });
}

module.exports = { errorMiddleware };
