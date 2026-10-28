---
name: api-contracts-events
description: Definir y mantener contratos entre microservicios: endpoints, DTOs, respuestas de error, versionado, eventos de dominio y su payload. Usar antes de crear o modificar un endpoint, o al publicar/consumir eventos.
---

# Contratos API y Eventos

> Este skill existe para evitar el problema clásico de los monorepos: que
> cuatro personas definan cuatro formas distintas de lo mismo y luego nada
> funcione junto. **Los contratos se definen antes de codificar.**

## Flujo obligatorio

1. Necesitas un endpoint o un evento nuevo.
2. **Primero** lo escribes en `docs/contratos-api.md` o `docs/eventos.md`.
3. Lo discutes con los integrantes afectados.
4. Recién ahí lo implementas.

Un cambio de contrato afecta a más de una persona. No se improvisa en el
código esperando que el otro adivine.

## Convenciones de endpoint

| Regla | Ejemplo |
|---|---|
| Versión obligatoria | `/api/v1/part-requests` |
| Recursos en plural | `/offers`, nunca `/offer` |
| `kebab-case` | `/part-requests`, no `/partRequests` |
| Subrecurso con id | `/offers/:id/accept` |
| Filtros por query | `/part-requests?city=La%20Paz&status=PUBLISHED` |
| Acciones como verbos | `/offers/:id/accept` (POST) |

## El envelope de respuesta

**Todas** las respuestas, sin excepción:

```json
{ "status": 200, "msg": "Operación exitosa", "data": { } }
```

```json
{ "status": 400, "msg": "El campo 'email' es obligatorio", "data": null }
```

- `status` coincide con el código HTTP.
- `msg` en español, legible para humanos.
- `data` es `null` en errores.

DRF (Identity) y Express devuelven por defecto formatos distintos. Ambos
deben serializar a este envelope. Ver `core/responses.py` en Django y
`presentation/http/errorHandler.js` en Express.

## Códigos de estado

| Código | Cuándo |
|---|---|
| `200` | Lectura o actualización exitosa |
| `201` | Recurso creado |
| `400` | Datos inválidos o falta un campo obligatorio |
| `401` | Sin token, o token inválido/expirado |
| `403` | Token válido pero el rol no tiene permiso |
| `404` | Recurso no encontrado |
| `409` | Conflicto: email ya registrado, **oferta ya aceptada** |
| `422` | Regla de negocio violada: transición de estado inválida |
| `500` | Error interno. **Nunca** exponer el stack trace |

### `409` vs `422`

- **`409`** — el recurso está en un estado que impide la operación y **otra
  persona** pudo haberlo causado. Ej: aceptar una oferta cuando ya hay otra
  aceptada.
- **`422`** — los datos son sintácticamente correctos pero violan una regla
  del negocio. Ej: `PENDING → SHIPPED` sin pasar por `PREPARING`.

## El JWT y los headers del Gateway

El Gateway valida el token y lo descompone. Los microservicios leen estos
headers:

```
X-User-Id:         12
X-User-Roles:      COMPRADOR
X-User-Email:      juan@taller.com
X-Correlation-Id:  a1b2c3d4-...
```

**Reglas:**
- Los microservicios **leen** estos headers para saber quién pide.
- Pero **también deben validar la firma** del JWT con el mismo `JWT_SECRET`.
  Si alguien llega al servicio directamente por la red Docker, no se cola.
- `X-Correlation-Id` viaja por todo el flujo. Si no viene, se genera uno. Es
  lo que permite trazar una operación a través de seis servicios.

## Versionado

- Toda API nueva lleva versión desde el inicio: `api/v1`.
- Un cambio que **rompe** compatibilidad → `api/v2`, no se edita `v1`.
- Agregar un campo opcional o un endpoint nuevo **no** rompe: sigue en `v1`.

## Eventos

Ver `docs/eventos.md` para el payload completo. Lo esencial:

### Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Eventos | `MAYUSCULAS_SNAKE_CASE` | `OFFER_ACCEPTED` |
| Topics | `minusculas_snake_case` | `offer_events` |
| Colas de consumidor | `<servicio>.<área>.<evento>` | `order-service.order.created` |

### El envelope del evento

```json
{
  "event_name":    "OFFER_ACCEPTED",
  "occurred_at":   "2026-10-28T14:35:12.000Z",
  "correlation_id":"a1b2c3d4-...",
  "producer":      "offer-service",
  "payload":       { }
}
```

- `occurred_at` ISO 8601 UTC. Es **cuándo pasó**, no cuándo se consumió.
- `producer` facilita depurar.
- `correlation_id` traza la operación completa.

### Los eventos del proyecto

```
identity_events      USER_CREATED, USER_ROLE_CHANGED
part_request_events  PART_REQUEST_CREATED, PART_REQUEST_STATUS_CHANGED
offer_events         OFFER_SUBMITTED, OFFER_ACCEPTED, OFFER_REJECTED
order_events         ORDER_CREATED, ORDER_STATUS_CHANGED
catalog_events       VEHICLE_REGISTERED
notification_events  NOTIFICATION_SENT
```

`OFFER_ACCEPTED` es el evento más importante: es el que dispara la creación
del pedido. Su payload mínimo:

```json
{
  "offer_id":  78,
  "request_id":34,
  "provider_id":55,
  "buyer_id":  12,
  "price":     1250.50,
  "currency":  "BOB",
  "delivery_type": "DELIVERY"
}
```

## Reglas de los eventos

1. **Un evento es un hecho del pasado.** En pasado: `OFFER_ACCEPTED`, no
   `ACCEPT_OFFER`. No es una orden, es un aviso.
2. **Son inmutables.** Una vez publicado no se edita. Para corregir, se
   publica un evento compensador.
3. **No bloquean al productor.** Publicar es *fire-and-forget*. Si necesitas
   respuesta inmediata, usa HTTP.
4. **Los consumidores deben ser idempotentes.** RabbitMQ entrega al menos
   una vez; puede repetir un mensaje tras reconectarse. Registrar los
   mensajes procesados y saltar duplicados.
5. **Un consumidor no puede romper al productor.** Si falla, se reintenta y
   acaba en una cola de errores (`.dlq`).

## Tipos compartidos

Cuando varios servicios necesitan el mismo tipo, va en `packages/shared/`.
Pero solo **contratos y tipos**, nunca lógica de negocio:

```
packages/shared/
├── types/
│   ├── offer-status.ts
│   ├── order-status.ts
│   └── events.ts        // interfaces de los payloads
└── enums/
    └── roles.ts
```

Compartir lógica de negocio entre servicios es cómo un monorepo se vuelve un
monolito disfrazado de microservicios.

## Al modificar un contrato

- [ ] ¿Está documentado en `docs/contratos-api.md` o `docs/eventos.md`?
- [ ] ¿Avisaste a los integrantes afectados?
- [ ] ¿Es un cambio compatible o rompe algo existente?
- [ ] ¿Si rompe, estás versionando (`api/v2`) en lugar de editar?
- [ ] ¿Los consumidores del evento pueden manejar el payload nuevo?
