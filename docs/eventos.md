# Eventos

Un evento es un **hecho que ya pasó**, nombrado en pasado. Quien lo publica no
sabe quién lo escucha.

## Sobre (igual para todos)

```json
{
  "event_id": "2f1c7a0e-8a1b-4c55-9b0e-0c1d2e3f4a5b",
  "event_name": "OFFER_ACCEPTED",
  "version": 1,
  "occurred_at": "2026-11-10T14:35:12.000Z",
  "correlation_id": "a1b2c3d4-...",
  "producer": "negociacion",
  "payload": { }
}
```

- `event_id`: UUID único. **Es la llave para no procesar dos veces.**
- `occurred_at`: ISO 8601 en UTC, cuándo pasó.
- `correlation_id`: viene del Gateway (`X-Correlation-Id`) y viaja por todo
  el flujo.

## Exchanges y routing keys

- Exchanges tipo `topic`, durables: `identity_events`,
  `part_request_events`, `offer_events`, `order_events`.
- `routing_key` = nombre del evento (`OFFER_ACCEPTED`).
- Mensajes persistentes, `content-type: application/json`.

## Mapa de eventos

| Evento | Publica | Consume | Para qué |
|---|---|---|---|
| `USER_CREATED` | Identidad | — | Informativo |
| `SUPPLIER_PROFILE_SUBMITTED` | Identidad | Notificaciones | Avisar a los admins |
| `SUPPLIER_APPROVED` | Identidad | Negociación, Notificaciones | Copia local de proveedores aprobados; avisar al proveedor |
| `SUPPLIER_REJECTED` | Identidad | Negociación, Notificaciones | Quitar de la copia; avisar al proveedor |
| `PART_REQUEST_CREATED` | Negociación | Notificaciones | Avisar a proveedores aprobados de esa categoría y ciudad |
| `PART_REQUEST_STATUS_CHANGED` | Negociación | — | Informativo |
| `OFFER_SUBMITTED` | Negociación | Notificaciones | Avisar al comprador |
| `OFFER_ACCEPTED` | Negociación | **Pedidos**, Notificaciones | **Crear el pedido**; avisar al proveedor elegido |
| `OFFER_REJECTED` | Negociación | Notificaciones | Avisar a los no elegidos |
| `ORDER_CREATED` | Pedidos | Notificaciones | Avisar al comprador que pague y al proveedor |
| `ORDER_STATUS_CHANGED` | Pedidos | **Negociación**, Notificaciones | Si es `COMPLETED`, completar la solicitud; avisar a la otra parte |

## Payloads

```jsonc
// SUPPLIER_PROFILE_SUBMITTED
{ "supplier_id": 55, "business_name": "AutoParts Center" }

// SUPPLIER_APPROVED
{ "supplier_id": 55, "business_name": "AutoParts Center", "city": "Santa Cruz", "category_ids": [1, 3] }

// SUPPLIER_REJECTED
{ "supplier_id": 55, "reason": "Datos incompletos" }

// PART_REQUEST_CREATED
{ "part_request_id": 34, "buyer_id": 7, "category_id": 1, "category_name": "Frenos",
  "vehicle_label": "Toyota Corolla 2018", "description": "Pastillas de freno delanteras",
  "city": "Santa Cruz", "urgency": "ALTA" }

// PART_REQUEST_STATUS_CHANGED
{ "part_request_id": 34, "previous_status": "PUBLISHED", "new_status": "RECEIVING_OFFERS" }

// OFFER_SUBMITTED
{ "offer_id": 78, "part_request_id": 34, "buyer_id": 7, "supplier_id": 55,
  "supplier_name": "AutoParts Center", "price": 620.00, "currency": "BOB" }

// OFFER_ACCEPTED  ← trae todo lo que Pedidos necesita para no consultar a nadie
{ "offer_id": 78, "part_request_id": 34, "buyer_id": 7, "supplier_id": 55,
  "supplier_name": "AutoParts Center", "price": 620.00, "currency": "BOB",
  "delivery_type": "DELIVERY", "estimated_days": 2,
  "part_description": "Pastillas de freno delanteras", "vehicle_label": "Toyota Corolla 2018" }

// OFFER_REJECTED
{ "offer_id": 79, "part_request_id": 34, "supplier_id": 60, "reason": "NOT_SELECTED" }

// ORDER_CREATED
{ "order_id": 12, "offer_id": 78, "part_request_id": 34, "buyer_id": 7, "supplier_id": 55,
  "total": 620.00, "currency": "BOB", "status": "PENDING_PAYMENT" }

// ORDER_STATUS_CHANGED
{ "order_id": 12, "part_request_id": 34, "buyer_id": 7, "supplier_id": 55,
  "previous_status": "PREPARING", "new_status": "IN_TRANSIT", "changed_by": 55 }
```

## Publicar sin perder eventos (outbox)

En **Negociación** y **Pedidos**:

1. En la **misma transacción** que el cambio de negocio, se inserta el sobre
   en `outbox_events`.
2. Un proceso en segundo plano (cada 1–2 s) lee lo que tiene
   `published_at IS NULL`, publica con confirmación de RabbitMQ y marca
   `published_at`.
3. Si RabbitMQ está caído, el evento espera en la tabla y se reintenta.

**Identidad** publica después de confirmar la transacción
(`transaction.on_commit`), con reintento simple.

## Consumir sin duplicar (idempotencia)

1. Cada consumidor tiene **su propia cola**: `<servicio>.<evento>` →
   `pedidos.offer_accepted`, `negociacion.order_status_changed`,
   `negociacion.supplier_events`, `notificaciones.all`.
2. Al recibir: en una transacción, si el `event_id` ya está en
   `processed_events`, se descarta; si no, se aplica el efecto y se guarda el
   `event_id`.
3. `ack` solo después de confirmar la transacción.
4. Si falla: `nack` sin reencolar → va a la cola de errores `<cola>.dlq`
   (dead-letter exchange `dlx`) y se registra en el log.

   Convención exacta, igual para toda cola nueva (fase 2 en adelante):
   - Exchange `dlx`: `direct`, durable. Se declara una sola vez por servicio.
   - Por cada cola principal `<cola>`, se declara también `<cola>.dlq`
     (durable), enlazada a `dlx` con routing key `<cola>.dlq`.
   - La cola principal `<cola>` se declara con los argumentos
     `x-dead-letter-exchange: dlx` y
     `x-dead-letter-routing-key: <cola>.dlq`.
   - Con eso, un `nack(requeue=false)` en `<cola>` basta: RabbitMQ reenvía
     el mensaje a `dlx` con la routing key `<cola>.dlq`, que lo entrega a
     `<cola>.dlq`. Nadie publica a `dlx` directamente.

## Reglas

- Los eventos no se editan. Para corregir, se publica otro evento.
- Un campo nuevo en un payload es compatible. Quitar o renombrar uno exige
  `version: 2`.
- Ningún servicio espera la respuesta de un evento. Si necesita respuesta, usa
  HTTP.
