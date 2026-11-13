# Offer Service

Servicio Express responsable de registrar ofertas y seleccionar una sola
oferta por solicitud. La base de datos es exclusiva del servicio.

## Ejecutar

Desde esta carpeta:

```powershell
npm install
npm run dev
npm test
```

Requiere que PostgreSQL (`offer_db`) y RabbitMQ estén disponibles y que la
configuración de la raíz esté copiada desde `.env.example` a `.env`. El
servicio escucha en `OFFER_PORT` (4002). La tabla inicial se crea con
Sequelize; los índices de invariantes se aplican desde `migrations/`.

## Endpoints

- `POST /api/v1/offers` — solo proveedor; valida que la solicitud esté publicada.
- `GET /api/v1/offers?request_id=...` — solo el comprador propietario.
- `GET /api/v1/offers` or `GET /api/v1/offers?provider_id=...` — ofertas del
  proveedor autenticado; `provider_id` no permite consultar las de otra persona.
- `GET /api/v1/offers/:id` — proveedor propietario, comprador propietario o admin.
- `POST /api/v1/offers/:id/accept` — solo comprador propietario.

Las respuestas usan `{ status, msg, data }`. Las ofertas admiten BOB, dos
decimales y múltiples propuestas de un mismo proveedor para la misma
solicitud. Al aceptar una, las demás pendientes se rechazan.

La creación y aceptación bloquean la misma fila local de `request_acceptances`,
evitando que una nueva oferta se cuele después de aceptar otra. La base aplica
además un índice único parcial sobre ofertas aceptadas. La decisión y los
eventos a publicar se guardan en la misma transacción; el dispatcher reintenta
la publicación del outbox.

Offer Service consulta `GET /api/v1/part-requests/:id` por HTTP para revisar
estado y propietario; nunca accede a la base de otro servicio.

Si el endpoint versionado aún no está disponible, el cliente prueba la ruta
legacy `/api/requests/:id` del Part Request Service. En ambos casos exige un
estado de solicitud legible y valida el propietario antes de aceptar o revelar
ofertas; no accede a la base de datos de otro servicio.

`OFFER_OUTBOX_POLL_INTERVAL_MS` controla el intervalo de reintento del outbox
y usa `1000` ms por defecto.
