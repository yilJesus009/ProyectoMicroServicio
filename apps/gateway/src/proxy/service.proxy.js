const { createProxyMiddleware } = require('http-proxy-middleware');

function createServiceProxy(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (_path, req) => req.originalUrl,
    proxyTimeout: 10000,
    timeout: 10000,
    on: {
      proxyReq(proxyReq, req) {
        proxyReq.setHeader('X-Correlation-Id', req.correlationId);

        if (req.user) {
          proxyReq.setHeader('X-User-Id', req.user.id);
          proxyReq.setHeader('X-User-Roles', req.user.roles);
          if (req.user.email) {
            proxyReq.setHeader('X-User-Email', req.user.email);
          }
        }
      },
      error(error, req, res) {
        console.error(`Error al comunicarse con un servicio: ${error.message}`);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 502,
              msg: 'Servicio temporalmente no disponible',
              data: null,
            })
          );
        }
      },
    },
  });
}

module.exports = { createServiceProxy };