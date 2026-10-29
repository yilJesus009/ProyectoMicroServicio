# Contratos API

> **Este documento se define ANTES de codificar.** Es el acuerdo entre
> integrantes: si cambia, se discute primero y se documenta aquí mediante PR.
> Nadie improvisa un endpoint esperando que el otro adivine.

> ⚠️ **Estado: BORRADOR.** Falta acordar con el equipo los campos exactos de
> Offer y Order. Lo que está marcado como `[POR ACORDAR]` debe cerrarse en la
> primera reunión técnica.

---

## Convención general

- Prefijo versionado: `/api/v1`
- El frontend **siempre** habla con el Gateway (`http://localhost:4000`).
- Todas las respuestas usan el envelope `{ status, msg, data }`.
- Rutas protegidas validan el JWT. El Gateway añade `X-User-Id` y `X-User-Roles`.

---

## Identity Service (`:5000`)

### `POST /api/v1/auth/register`
Crea un usuario. Público.

**Request**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@taller.com",
  "contrasena": "secreto123",
  "telefono": "76543210",
  "ciudad": "La Paz",
  "rol": "COMPRADOR"
}
```

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `nombre` | string | ✅ | |
| `email` | string | ✅ | Único. Devuelve `409` si ya existe |
| `contrasena` | string | ✅ | Se hashea con bcrypt, nunca se guarda en claro |
| `telefono` | string | ❌ | |
| `ciudad` | string | ❌ | |
| `rol` | enum | ✅ | `COMPRADOR` \| `PROVEEDOR` \| `ADMIN` |

**Respuesta `201`**
```json
{
  "status": 201,
  "msg": "Usuario registrado exitosamente",
  "data": {
    "id": 12,
    "nombre": "Juan Pérez",
    "email": "juan@taller.com",
    "telefono": "76543210",
    "ciudad": "La Paz",
    "rol": "COMPRADOR"
  }
}
```

### `POST /api/v1/auth/login`
Devuelve el JWT. Público.

**Request**
```json
{ "email": "juan@taller.com", "contrasena": "secreto123" }
```

**Respuesta `200`**
```json
{
  "status": 200,
  "msg": "Inicio de sesión exitoso",
  "data": {
    "token": "<jwt>",
    "expires_in": 3600,
    "usuario": { "id": 12, "nombre": "Juan Pérez", "rol": "COMPRADOR" }
  }
}
```

**Errores**
- `401` credenciales incorrectas o usuario inactivo

### `GET /api/v1/auth/me`
Devuelve el usuario del token. Requiere `Authorization: Bearer <jwt>`.

### `POST /api/v1/auth/verify`
Lo consume el Gateway para validar un token.

**Respuesta `200`**
```json
{ "valid": true, "user_id": 12, "rol": "COMPRADOR", "email": "juan@taller.com" }
```

**Errores**
- `401` `{ "valid": false }` si el token es inválido o expiró

---

## Part Request Service (`:4001`)

### `POST /api/v1/part-requests`
Crea una solicitud. Requiere rol `COMPRADOR`. Acepta `multipart/form-data`
porque puede llevar fotografía.

**Request**
```
vehicle_brand   string  ✅  "Toyota"
vehicle_model   string  ✅  "Hilux"
vehicle_year    int     ✅  2019
description     text    ✅  "Filtro de aceite original"
city            string  ✅  "La Paz"
urgency         enum    ❌  BAJA | MEDIA | ALTA   (default MEDIA)
photo           file    ❌  imagen del repuesto
```

**Respuesta `201`** con el objeto creado, incluyendo `id` y `status: "PUBLISHED"`.

**Efecto:** publica `PART_REQUEST_CREATED` en `part_request_events`.

### `GET /api/v1/part-requests`
Lista solicitudes. Público o autenticado según filtro.

| Query | Tipo | Notas |
|---|---|---|
| `city` | string | Filtra por ciudad |
| `status` | enum | `PUBLISHED`, `ORDERED`, `COMPLETED`, `CANCELLED` |
| `urgency` | enum | `BAJA`, `MEDIA`, `ALTA` |

### `GET /api/v1/part-requests/:id`
Detalle de una solicitud.

### `PATCH /api/v1/part-requests/:id/status`
Cambia el estado. Requiere ser el dueño de la solicitud.

**Request**
```json
{ "status": "ORDERED" }
```

**Máquina de transiciones** (lo demás devuelve `422`):

```
PUBLISHED ──► ORDERED    (oferta aceptada, pedido generado)
PUBLISHED ──► CANCELLED  (el dueño cancela antes de aceptar oferta)
ORDERED   ──► COMPLETED  (pedido finalizado)

COMPLETED y CANCELLED son estados terminales.
```

**Efecto:** publica `PART_REQUEST_STATUS_CHANGED`.

### `GET /api/v1/part-requests/:id/check-status`
Lo consume el frontend para mostrar el estado mientras se procesa el pedido.
Devuelve solo el estado, respuesta liviana.

---

## Offer Service (`:4002`)

### `POST /api/v1/offers`
Envía una oferta. Requiere rol `PROVEEDOR`.

**Request**
```json
{
  "request_id": 34,
  "price": 1250.50,
  "currency": "BOB",
  "brand": "Genérico",
  "condition": "NEW",
  "availability": "IN_STOCK",
  "delivery_type": "DELIVERY",
  "estimated_delivery_days": 3,
  "notes": "Repuesto nuevo, garantía de 6 meses"
}
```

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `request_id` | int | ✅ | Debe existir y estar `PUBLISHED` |
| `price` | decimal | ✅ | `[POR ACORDAR]` moneda fija o configurable |
| `currency` | string | ❌ | default `BOB` |
| `brand` | string | ✅ | Marca del repuesto ofrecido |
| `condition` | enum | ✅ | `NEW` \| `USED` \| `REFURBISHED` |
| `availability` | enum | ✅ | `IN_STOCK` \| `ORDER_REQUIRED` |
| `delivery_type` | enum | ✅ | `PICKUP` \| `DELIVERY` |
| `estimated_delivery_days` | int | ✅ | |
| `notes` | text | ❌ | |

**Errores**
- `404` la solicitud no existe o no está publicada
- `409` el proveedor ya envió una oferta para esta solicitud
  `[POR ACORDAR]` ¿permitimos varias ofertas del mismo proveedor?

**Efecto:** publica `OFFER_SUBMITTED`.

### `GET /api/v1/offers?request_id=34`
Ofertas de una solicitud. Requiere ser el dueño de la solicitud.

### `GET /api/v1/offers?provider_id=55`
Ofertas enviadas. Requiere rol `PROVEEDOR`.

### `POST /api/v1/offers/:id/accept`
**La operación más crítica del proyecto.** Requiere ser el dueño de la solicitud.

**Garantías:**
- Usa `SELECT ... FOR UPDATE` sobre la solicitud.
- Índice `UNIQUE` parcial en BD como defensa final.
- Acepta esta oferta y rechaza las demás en una **misma transacción**.

**Errores**
- `403` no es el dueño de la solicitud
- `409` la solicitud ya tiene una oferta aceptada
- `422` la solicitud ya no está en estado aceptable

**Efecto:** publica `OFFER_ACCEPTED` y `OFFER_REJECTED` por cada oferta descartada.

### `POST /api/v1/offers/:id/reject`
Rechazo manual de una oferta. `[POR ACORDAR]` si se expone o el sistema
rechaza automáticamente las no seleccionadas.

---

## Order Service (`:4003`)

### `POST /api/v1/orders`
**No se llama desde el frontend.** El pedido se crea consumiendo `OFFER_ACCEPTED`.
Se documenta aquí para que quede claro el contrato del evento.

### `GET /api/v1/orders/:id`
Detalle del pedido.

### `GET /api/v1/orders?buyer_id=12`
Pedidos como comprador.

### `GET /api/v1/orders?provider_id=55`
Pedidos como proveedor.

### `PATCH /api/v1/orders/:id/status`
Cambia el estado del pedido.

**Request**
```json
{ "status": "PREPARING" }
```

**Validación de transición:**
```
PENDING ─► PREPARING ─► SHIPPED ─► DELIVERED ─► COMPLETED
   └──────────┴───────────┴───────────┴───► CANCELLED
```
Una transición inválida devuelve `422`.

**Efecto:** publica `ORDER_STATUS_CHANGED`.

---

## Catalog / Vehicle Service (`:4004`)

### `GET /api/v1/vehicles`
Lista vehículos registrados.

### `POST /api/v1/vehicles`
Registra un vehículo.

### `GET /api/v1/parts/categories`
Categorías de repuestos.

### `GET /api/v1/parts/references?brand=Toyota&model=Hilux&year=2019`
Referencias de repuestos compatibles con un vehículo. `[POR ACORDAR]` alcance.

---

## Notification Service (`:4005`)

No expone API pública al exterior. Consume eventos de todos los topics y
genera avisos.

### `GET /api/v1/notifications?user_id=12`
Lista de avisos de un usuario. Accesible solo vía Gateway con el propio token.

---

## Eventos entre servicios

Ver `docs/eventos.md` para el payload completo de cada evento y las colas.

---

## Pendientes por acordar

- [ ] ¿Una misma solicitud acepta varias ofertas del mismo proveedor?
- [ ] ¿Precio fijo en BOB o configurable por usuario?
- [ ] ¿Alcance del catálogo de referencias de repuestos?
- [ ] ¿Quién confirma `DELIVERED`: el proveedor o el solicitante?
- [ ] ¿Rechazo manual de ofertas o solo automático?
- [ ] Formato exacto de la fotografía (límite de tamaño, formatos permitidos).
