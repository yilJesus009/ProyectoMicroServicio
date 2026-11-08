# Contratos API

> Se acuerdan **antes** de programar. Si un endpoint cambia, se actualiza
> aquí en el mismo PR.

- Todo pasa por el Gateway: `http://localhost:4000/api/v1/...`
- Sobre de respuesta: `{ status, msg, data }`. Campos JSON en `snake_case`.
- 🔓 público · 🔑 cualquier usuario autenticado · 👤 `COMPRADOR` ·
  🏪 `PROVEEDOR` · 🏪✅ `PROVEEDOR` aprobado · 🛡️ `ADMIN`

---

## Identidad (Django)

Los endpoints de autenticación ya están implementados y se mantienen.

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| POST | `/auth/register` | 🔓 | Registro. Body: `nombre`, `email`, `contrasena`, `telefono`, `ciudad`, `rol` (`COMPRADOR` o `PROVEEDOR`) → 201 |
| POST | `/auth/login` | 🔓 | Body: `email`, `contrasena` → `{ token, expires_in, usuario: { id, nombre, rol } }` |
| GET | `/auth/me` | 🔑 | Usuario del token |
| POST | `/auth/verify` | 🔑 | Valida un token |
| GET | `/suppliers/me` | 🏪 | Perfil comercial propio (o 404 si no existe) |
| PUT | `/suppliers/me` | 🏪 | Crea o actualiza el perfil: `business_name`, `city`, `phone`, `category_ids[]`. Queda `PENDING` |
| GET | `/admin/suppliers?status=PENDING` | 🛡️ | Perfiles por estado |
| POST | `/admin/suppliers/{id}/approve` | 🛡️ | Aprueba → publica `SUPPLIER_APPROVED` |
| POST | `/admin/suppliers/{id}/reject` | 🛡️ | Body: `reason` → publica `SUPPLIER_REJECTED` |

El admin se crea por comando o semilla, nunca desde el registro público.

---

## Negociación (Express)

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| POST | `/part-requests` | 👤 | Crea una solicitud (multipart). Campos: `category_id`, `vehicle_brand`, `vehicle_model`, `vehicle_year`, `description`, `city`, `urgency`, `photo` (opcional, jpg/png/webp, máx. 5 MB) → 201, estado `PUBLISHED` |
| GET | `/part-requests/mine` | 👤 | Mis solicitudes |
| GET | `/part-requests/open?city=&category_id=` | 🏪✅ | Solicitudes en `PUBLISHED` o `RECEIVING_OFFERS` |
| GET | `/part-requests/{id}` | 🔑 | Detalle. Solo el dueño o un proveedor aprobado |
| GET | `/part-requests/{id}/photo` | 🔑 | La fotografía |
| PATCH | `/part-requests/{id}/cancel` | 👤 dueño | Solo si `PUBLISHED` o `RECEIVING_OFFERS` → `CANCELLED` |
| GET | `/part-requests/{id}/offers?sort=price\|days` | 👤 dueño | **Comparador**: todas las ofertas de la solicitud |
| POST | `/part-requests/{id}/offers` | 🏪✅ | Envía oferta: `price`, `brand`, `condition`, `availability`, `delivery_type`, `estimated_days`, `notes` → 201 |
| GET | `/offers/mine` | 🏪 | Mis ofertas con su estado |
| PATCH | `/offers/{id}/withdraw` | 🏪 dueño | Solo si `SUBMITTED` y la solicitud sigue abierta → `WITHDRAWN` |
| POST | `/offers/{id}/accept` | 👤 dueño de la solicitud | **La operación crítica** (ver abajo) |

**`POST /offers/{id}/accept`** — en una transacción:
1. Bloquea la solicitud (`SELECT ... FOR UPDATE`).
2. Verifica que esté en `PUBLISHED` o `RECEIVING_OFFERS` → si no, **422**.
3. Verifica que no haya otra oferta `ACCEPTED` → si la hay, **409**.
4. Marca la oferta `ACCEPTED`, las demás `SUBMITTED` como `REJECTED` y la
   solicitud como `OFFER_ACCEPTED`.
5. Guarda en el outbox `OFFER_ACCEPTED` y un `OFFER_REJECTED` por cada
   rechazada.

Respuesta 200: `{ offer, part_request }`. El pedido aparece unos segundos
después en Pedidos.

Errores de oferta: **403** si el proveedor no está aprobado, **409** si ya
tiene una oferta activa en esa solicitud, **422** si la solicitud no acepta
ofertas.

Ejemplo de oferta en el comparador:
```json
{
  "id": 78, "part_request_id": 34, "supplier_id": 55, "supplier_name": "AutoParts Center",
  "price": 620.00, "currency": "BOB", "brand": "KYB", "condition": "NEW",
  "availability": "IN_STOCK", "delivery_type": "DELIVERY", "estimated_days": 2,
  "notes": null, "status": "SUBMITTED", "created_at": "2026-11-10T14:00:00Z"
}
```

---

## Pedidos (Spring Boot)

No existe endpoint para crear pedidos: nacen del evento `OFFER_ACCEPTED`.

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| GET | `/orders/mine` | 👤 | Mis pedidos como comprador |
| GET | `/orders/supplier` | 🏪 | Mis pedidos como proveedor |
| GET | `/orders/{id}` | 🔑 comprador o proveedor del pedido | Detalle con historial de estados y pago |
| GET | `/orders/by-offer/{offerId}` | 👤 | Busca el pedido de una oferta. **404 mientras no se haya creado**: el frontend reintenta cada 2 s |
| POST | `/orders/{id}/payment` | 👤 dueño | Body: `{ "method": "QR" \| "CARD" }`. Solo si `PENDING_PAYMENT` → registra el pago simulado y pasa a `PREPARING`. Devuelve `reference` |
| PATCH | `/orders/{id}/status` | 🏪 dueño | Body: `{ "status": ... }`. Transiciones válidas en `docs/flujo-principal.md`; si no, **422** |
| POST | `/orders/{id}/confirm-receipt` | 👤 dueño | Solo si `DELIVERED` → `COMPLETED` |

Ejemplo de pedido:
```json
{
  "id": 12, "offer_id": 78, "part_request_id": 34, "buyer_id": 7, "supplier_id": 55,
  "supplier_name": "AutoParts Center", "part_description": "Amortiguador delantero derecho",
  "vehicle_label": "Toyota Corolla 2018", "price": 620.00, "currency": "BOB",
  "delivery_type": "DELIVERY", "estimated_days": 2, "status": "PREPARING",
  "payment": { "method": "QR", "reference": "PAY-20261110-000012", "paid_at": "..." },
  "history": [ { "from_status": null, "to_status": "PENDING_PAYMENT", "changed_at": "..." } ]
}
```

---

## Catálogo (NestJS)

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| GET | `/categories` | 🔑 | Categorías activas |
| GET | `/categories/{id}` | 🔑 | Una categoría, **incluida inactiva**. Devuelve `active` siempre; lo usa Negociación para rechazar solicitudes con categoría desactivada |
| GET | `/admin/categories` | 🛡️ | Todas, incluidas las inactivas |
| POST | `/admin/categories` | 🛡️ | Crea: `name`, `description`, `icon` |
| PUT | `/admin/categories/{id}` | 🛡️ | Edita |
| PATCH | `/admin/categories/{id}/toggle` | 🛡️ | Activa o desactiva. No se borran |
| GET | `/vehicles/mine` | 👤 | Mis vehículos |
| POST | `/vehicles` | 👤 | Registra: `brand`, `model`, `year`, `plate` (opcional) |
| DELETE | `/vehicles/{id}` | 👤 dueño | Elimina |

---

## Notificaciones (Express)

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| GET | `/notifications/mine?unread=true` | 🔑 | Avisos del usuario (incluye los dirigidos a su rol) |
| GET | `/notifications/unread-count` | 🔑 | Número para la campanita |
| PATCH | `/notifications/{id}/read` | 🔑 dueño | Marca como leído |
| PATCH | `/notifications/read-all` | 🔑 | Marca todos como leídos |

---

## Salud

Cada servicio expone `GET /health` → `{ "status": "UP" }` (sin JWT, solo
dentro de Docker). El Gateway expone `GET /api/v1/health` con el estado de
todos.
