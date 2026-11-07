// GET /api/v1/health — estado de todos los microservicios.
//
// Consulta `GET /health` de cada servicio en paralelo y responde con el sobre
// del proyecto. Es PUBLICO (sin JWT): sirve para la defensa y para comprobar
// de un vistazo que el sistema esta completo.
//
// Se responde siempre 200: el endpoint informa el estado de cada servicio en
// `data`, en vez de fallar cuando alguno todavia no existe (durante las
// primeras fases no estan levantados todos).
const TIMEOUT_MS = 2500;

const SERVICE_NAMES = [
  'identidad',
  'negociacion',
  'pedidos',
  'catalogo',
  'notificaciones',
];

async function probe(baseUrl, fetchImpl) {
  try {
    const response = await fetchImpl(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return 'DOWN';

    const body = await response.json();
    // docs/contratos-api.md: cada servicio responde {"status": "UP"}.
    // Se acepta tambien "OK" por compatibilidad con servicios anteriores.
    return body && (body.status === 'UP' || body.status === 'OK') ? 'UP' : 'DOWN';
  } catch {
    // Servicio caido, sin resolver o sin puerto: DOWN, nunca 500.
    return 'DOWN';
  }
}

function createHealthHandler(serviceUrls, fetchImpl = fetch) {
  return async function healthHandler(_req, res) {
    const results = await Promise.all(
      SERVICE_NAMES.map((name) => probe(serviceUrls[name], fetchImpl))
    );

    const data = { gateway: 'UP' };
    SERVICE_NAMES.forEach((name, index) => {
      data[name] = results[index];
    });

    res.status(200).json({
      status: 200,
      msg: 'Estado de los servicios',
      data,
    });
  };
}

module.exports = { createHealthHandler, SERVICE_NAMES };
