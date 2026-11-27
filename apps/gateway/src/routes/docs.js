const express = require('express');
const swaggerUi = require('swagger-ui-express');

// Único lugar donde se ve una UI de Swagger (AGENTS.md 4.4: los demás
// servicios no exponen puerto al host). Cada entrada sabe, de cada
// servicio, dónde vive su spec EN LA RED INTERNA de Docker y si sus paths
// ya incluyen el prefijo /api/v1 o son relativos a él.
const SERVICES = {
  catalogo: { label: 'Catálogo', specPath: '/docs-json', prefixed: true },
  pedidos: { label: 'Pedidos', specPath: '/v3/api-docs', prefixed: true },
  identidad: { label: 'Identidad', specPath: '/api/v1/schema?format=json', prefixed: true },
  negociacion: { label: 'Negociación', specPath: '/docs.json', prefixed: false },
  notificaciones: { label: 'Notificaciones', specPath: '/docs.json', prefixed: false },
};

/** Reescribe `servers` para que "Try it out" pegue al Gateway, no a la red interna. */
function withPublicServers(document, publicBase, prefixed) {
  return { ...document, servers: [{ url: prefixed ? publicBase : `${publicBase}/api/v1` }] };
}

/**
 * Router de documentación: agrega la spec de todos los servicios por la
 * red interna de Docker y las sirve con una única UI (selector de
 * swagger-ui-express). No toca el router de /api/v1 (routes/index.js):
 * vive aparte, público y sin JWT, igual que /health.
 */
function createDocsRouter({ serviceUrls }) {
  const router = express.Router();

  router.get('/:service.json', async (req, res) => {
    const service = SERVICES[req.params.service];
    if (!service) {
      return res.status(404).json({ status: 404, msg: 'Servicio desconocido', data: null });
    }

    const baseUrl = serviceUrls[req.params.service];
    const publicBase = `${req.protocol}://${req.get('host')}`;
    try {
      const upstream = await fetch(`${baseUrl}${service.specPath}`);
      if (!upstream.ok) {
        return res.status(502).json({ status: 502, msg: `${service.label} no respondió`, data: null });
      }
      const document = await upstream.json();
      return res.json(withPublicServers(document, publicBase, service.prefixed));
    } catch {
      return res.status(502).json({ status: 502, msg: `No se pudo contactar a ${service.label}`, data: null });
    }
  });

  router.use(
    '/',
    swaggerUi.serve,
    swaggerUi.setup(null, {
      explorer: true,
      swaggerOptions: {
        urls: Object.entries(SERVICES).map(([key, { label }]) => ({ url: `/docs/${key}.json`, name: label })),
      },
    })
  );

  return router;
}

module.exports = { createDocsRouter, SERVICES };
