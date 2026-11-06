const SERVICE_ENV_VARS = {
  identity: 'IDENTITY_SERVICE_URL',
  partRequest: 'PART_REQUEST_SERVICE_URL',
  offer: 'OFFER_SERVICE_URL',
  order: 'ORDER_SERVICE_URL',
  catalog: 'CATALOG_SERVICE_URL',
  notification: 'NOTIFICATION_SERVICE_URL',
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

module.exports = { getServiceUrls };