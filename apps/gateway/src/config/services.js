// URLs de los microservicios, resueltas por NOMBRE DE CONTENEDOR dentro de
// Docker (AGENTS.md 8: nunca localhost dentro de la red de compose).
//
// Los nombres de las variables vienen de .env.example, que es la fuente de
// verdad de las variables de entorno (AGENTS.md 4.7).
const SERVICE_ENV_VARS = {
  identidad: 'IDENTIDAD_SERVICE_URL',
  negociacion: 'NEGOCIACION_SERVICE_URL',
  pedidos: 'PEDIDOS_SERVICE_URL',
  catalogo: 'CATALOGO_SERVICE_URL',
  notificaciones: 'NOTIFICACIONES_SERVICE_URL',
};

function getServiceUrls(env = process.env) {
  return Object.fromEntries(
    Object.entries(SERVICE_ENV_VARS).map(([service, variable]) => {
      const value = env[variable];
      if (!value) {
        throw new Error(`${variable} es obligatorio para iniciar el API Gateway`);
      }

      let parsedUrl;
      try {
        parsedUrl = new URL(value);
      } catch {
        throw new Error(`${variable} debe contener una URL válida`);
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error(`${variable} debe usar el protocolo HTTP o HTTPS`);
      }

      return [service, parsedUrl.origin];
    })
  );
}

module.exports = { getServiceUrls, SERVICE_ENV_VARS };
