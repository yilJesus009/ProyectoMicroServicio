const { randomUUID } = require('node:crypto');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function correlationIdMiddleware(req, res, next) {
  const incomingId = req.get('x-correlation-id');
  const correlationId =
    incomingId && UUID_PATTERN.test(incomingId) ? incomingId : randomUUID();

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
}

module.exports = { correlationIdMiddleware };
