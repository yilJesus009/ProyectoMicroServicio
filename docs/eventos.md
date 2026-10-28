# Eventos de dominio

> Los eventos son el acople entre microservicios. Un servicio **produce** un
> hecho que ya ocurrió; los interesados lo **consumen**. Nadie pregunta
> "qué pasó", se suscribe y ya.

## Nomenclatura

Tomada del proyecto de referencia y estandarizada:

- **Eventos** en `MAYUSCULAS_SNAKE_CASE`: `OFFER_ACCEPTED`
- **Topics** en `minusculas_snake_case`: `offer_events`
- Un topic agrupa los eventos de **un agregado**, no un servicio.

| Topic | Eventos que agrupa |
|---|---|
| `identity_events` | `USER_CREATED`, `USER_ROLE_CHANGED` |
| `part_request_events` | `PART_REQUEST_CREATED`, `PART_REQUEST_STATUS_CHANGED` |
| `offer_events` | `OFFER_SUBMITTED`, `OFFER_ACCEPTED`, `OFFER_REJECTED` |
| `order_events` | `ORDER_CREATED`, `ORDER_STATUS_CHANGED` |
| `catalog_events` | `VEHICLE_REGISTERED` |
| `notification_events` | `NOTIFICATION_SENT` |

## Formato del mensaje

Todo mensaje respeta esta forma. El **envelope** es igual en todos los
eventos; el `payload` cambia según el tipo.

```json
{
  "event_name": "OFFER_ACCEPTED",
  "occurred_at": "2026-10-28T14:35:12.000Z",
  "correlation_id": "a1b2c3d4-...",
  "producer": "offer-service",
  "payload": { }
}
```

- `event_name`: el tipo, en mayúsculas.
- `occurred_at`: ISO 8601 en UTC. Es **cuándo pasó**, no cuándo se consumió.
- `correlation_id`: id que viaja por todo el flujo de una operación. Es lo
  que permite trazar "esta solicitud originó esta oferta, que originó este pedido".
- `producer`: nombre del servicio que emitió. Facilita depurar.
- `payload`: los datos del hecho.

## Eventos y sus payloads

### `identity_events`

**`USER_CREATED`**
```json
{
  "user_id": 12,
  "email": "juan@taller.com",
  "role": "COMPRADOR",
  "city": "La Paz"
}
```

**`USER_ROLE_CHANGED`**
```json
{
  "user_id": 12,
  "previous_role": "COMPRADOR",
  "new_role": "PROVEEDOR"
}
```

### `part_request_events`

**`PART_REQUEST_CREATED`** — produce: part-request-service
```json
{
  "request_id": 34,
  "user_id": 12,
  "user_email": "juan@taller.com",
  "vehicle_brand": "Toyota",
  "vehicle_model": "Hilux",
  "vehicle_year": 2019,
  "city": "La Paz",
  "urgency": "ALTA"
}
```

**`PART_REQUEST_STATUS_CHANGED`**
```json
{
  "request_id": 34,
  "previous_status": "PUBLISHED",
  "new_status": "ORDERED"
}
```

### `offer_events`

**`OFFER_SUBMITTED`** — produce: offer-service. Consumen: part-request, notification.
```json
{
  "offer_id": 78,
  "request_id": 34,
  "provider_id": 55,
  "price": 1250.50,
  "currency": "BOB",
  "brand": "Genérico",
  "condition": "NEW",
  "availability": "IN_STOCK",
  "delivery_type": "DELIVERY",
  "estimated_delivery_days": 3
}
```

**`OFFER_ACCEPTED`** — produce: offer-service. **Este es el evento crítico**:
dispara la creación del pedido. Consumen: order-service, part-request, notification.
```json
{
  "offer_id": 78,
  "request_id": 34,
  "provider_id": 55,
  "buyer_id": 12,
  "price": 1250.50,
  "currency": "BOB",
  "delivery_type": "DELIVERY"
}
```

**`OFFER_REJECTED`**
```json
{
  "offer_id": 79,
  "request_id": 34,
  "provider_id": 60,
  "reason": "NOT_SELECTED"
}
```

### `order_events`

**`ORDER_CREATED`** — produce: order-service. Consumen: notification.
```json
{
  "order_id": 12,
  "request_id": 34,
  "offer_id": 78,
  "buyer_id": 12,
  "provider_id": 55,
  "total_price": 1250.50,
  "status": "PENDING"
}
```

**`ORDER_STATUS_CHANGED`**
```json
{
  "order_id": 12,
  "previous_status": "PENDING",
  "new_status": "PREPARING"
}
```

## Máquina de estados del pedido

```
PENDING ──► PREPARING ──► SHIPPED ──► DELIVERED ──► COMPLETED
   │            │            │            │
   └────────────┴────────────┴────────────┴────► CANCELLED
```

| Estado | Quién lo cambia |
|---|---|
| `PENDING` | order-service, al crear el pedido |
| `PREPARING` | Proveedor |
| `SHIPPED` | Proveedor |
| `DELIVERED` | Proveedor (o solicitante al recibir) |
| `COMPLETED` | Solicitante, confirma la finalización |
| `CANCELLED` | Cualquiera de las dos partes, antes de `SHIPPED` |

**Transiciones inválidas se rechazan con `422`.**

## Reglas de consumo

1. **Los consumidores deben ser idempotentes.** RabbitMQ entrega al menos una
   vez; si se reconecta, puede repetir un mensaje. Un consumidor debe poder
   recibir el mismo evento dos veces sin duplicar efectos. La forma estándar:
   guardar el `event_name + occurred_at + correlation_id` procesado.
2. **Un consumidor no puede fallar el mensaje de un productor.** Si el
   procesamiento falla, se reintenta y eventualmente va a una cola de
   errores (`<topic>.dlq` — dead letter queue) para inspección manual.
3. **Nunca bloquear al productor.** Publicar es *fire-and-forget*. Si un servicio
   necesita una respuesta síncrona, usa HTTP, no el bus de eventos.
4. **Los eventos no se editan.** Una vez publicado, un evento es inmutable.
   Para corregir, se publica un nuevo evento que compensa.

## Colas y bindings

| Queue | Binding | Consumidor |
|---|---|---|
| `order-service.order.created` | `offer_events` / `OFFER_ACCEPTED` | order-service |
| `part-request-service.offer.accepted` | `offer_events` / `OFFER_ACCEPTED` | part-request-service |
| `notification-service.*` | todos los topics | notification-service |

Cada consumidor usa **su propia cola** con nombre `<servicio>.<área>.<evento>`,
así todos reciben el mismo evento sin competir por él (patrón pub/sub).
