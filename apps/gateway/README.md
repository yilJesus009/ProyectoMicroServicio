# API Gateway

Servicio Express que recibe las llamadas del frontend, valida el JWT y reenvía
las solicitudes a los microservicios. El cliente solo debe usar este Gateway;
no debe llamar directamente a los puertos internos.

## Estructura

- `src/config/services.js`: valida y carga las URLs de los servicios.
- `src/middleware/auth.middleware.js`: valida JWT HS256 y prepara la identidad.
- `src/middleware/correlation-id.middleware.js`: crea o valida el ID de
  correlación que se propaga a los servicios.
- `src/middleware/error.middleware.js`: convierte errores inesperados al
  envelope `{ status, msg, data }`.
- `src/routes/index.js`: asigna los prefijos API al servicio correspondiente.
- `src/proxy/service.proxy.js`: reenvía método, ruta, query, headers y body.
- `src/app.js`: configura Express, CORS, salud, rutas y errores.
- `src/server.js`: carga variables de entorno e inicia el puerto configurado.

Registro e inicio de sesión son públicos. Las demás rutas bajo `/api/v1`
requieren `Authorization: Bearer <token>`. El Gateway acepta las claims
`user_id`, `userId`, `id` o `sub` para el identificador, y `rol`, `role` o
`roles` para el rol. Cada servicio conserva la responsabilidad de validar la
firma del token.

## Ejecución local

Configura las variables documentadas en el `.env.example` de la raíz y ejecuta:

```powershell
npm install
npm test
npm run dev
```

El Gateway requiere `API_GATEWAY_PORT`, `JWT_SECRET`, `FRONTEND_ORIGIN` y las
URLs de servicios `IDENTITY_SERVICE_URL`, `PART_REQUEST_SERVICE_URL`,
`OFFER_SERVICE_URL`, `ORDER_SERVICE_URL`, `CATALOG_SERVICE_URL` y
`NOTIFICATION_SERVICE_URL`.
