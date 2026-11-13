# Order Service

Servicio Express que crea pedidos exclusivamente al consumir `OFFER_ACCEPTED`
y administra su seguimiento. No hay endpoint HTTP para crear pedidos.

## Ejecutar

Desde esta carpeta:

```powershell
npm install
npm run dev
npm test
```

Requiere que PostgreSQL (`order_db`) esté disponible. La conexión a RabbitMQ
se reintenta automáticamente si el broker no está disponible al inicio. El
servicio escucha en `ORDER_PORT` (4003).

## Endpoints

- `GET /api/v1/orders/:id` — comprador o proveedor asociado; admin puede leer.
- `GET /api/v1/orders` — lista los pedidos del comprador o proveedor autenticado.
- `GET /api/v1/orders?buyer_id=...` / `?provider_id=...` — consultas explícitas
  equivalentes; solo se permite el identificador propio, salvo admin.
- `PATCH /api/v1/orders/:id/status` — avance permitido según rol y transición.
- `POST /api/v1/orders/:id/complete` — confirmación del comprador.

Entrega a domicilio: `PENDING -> PREPARING -> SHIPPED -> DELIVERED -> COMPLETED`.
Retiro: `PENDING -> PREPARING -> READY_FOR_PICKUP -> DELIVERED -> COMPLETED`.
Para retiro, el comprador confirma `DELIVERED`; en entregas a domicilio lo
marca el proveedor. En ambos casos el comprador confirma `COMPLETED`.
Comprador o proveedor pueden cancelar antes de despacho o de que el repuesto
quede listo para retiro.

El consumidor de RabbitMQ registra eventos procesados y el pedido tiene un
índice único por `offer_id`. Pedido, evento procesado y evento de outbox se
confirman en una sola transacción local. Los fallos de consumo se reintentan
con demora y terminan en la cola durable
`order-service.order.created.dead`.

Después de corregir la causa del fallo, un operador puede volver a publicar
los mensajes de esa cola ejecutando `npm run replay:dead`. El consumo es
idempotente; revisa la causa antes de reproducir una DLQ para evitar un ciclo
de reintentos de mensajes inválidos.

`ORDER_OUTBOX_POLL_INTERVAL_MS` controla el dispatcher (por defecto `1000` ms),
`ORDER_EVENT_RETRY_DELAY_MS` el retraso de reintento (por defecto `5000` ms) y
`ORDER_EVENT_MAX_RETRIES` la cantidad de reintentos antes de la cola de errores
(por defecto `5`).
