---
name: api-contracts-events
description: Definir y mantener contratos entre microservicios — endpoints, DTOs, respuestas de error, versionado, eventos de dominio y su payload, outbox e idempotencia. Usar antes de crear o modificar un endpoint, o al publicar/consumir eventos.
---

# Contratos API y Eventos

> Evita el problema clásico del monorepo: que cada integrante defina una
> forma distinta de lo mismo. **El contrato se escribe antes de codificar.**

## Flujo obligatorio

1. Necesitas un endpoint o evento nuevo.
2. **Primero** se escribe en `docs/contratos-api.md` o `docs/eventos.md`.
3. Se avisa al otro integrante si el contrato ya existía y cambia.
4. Recién ahí se implementa.

## Convenciones de endpoint

| Regla | Ejemplo |
|---|---|
| Versión obligatoria | `/api/v1/part-requests` |
| Recursos en plural, `kebab-case` | `/offers`, no `/offer` |
| Subrecurso con id | `/offers/:id/accept` |
| Filtros por query | `/part-requests?city=La%20Paz&status=PUBLISHED` |

## El envelope de respuesta (todas, sin excepción)

```json
{ "status": 200, "msg": "Operación exitosa", "data": { } }
{ "status": 422, "msg": "La solicitud ya no acepta ofertas", "data": null }
```

`status` = código HTTP; `msg` en español; `data: null` en errores; campos
del body en `snake_case`. Django (`core/responses.py`) y Express/NestJS/
Spring deben serializar todos a este mismo formato.

## Códigos de estado

| Código | Cuándo |
|---|---|
| `200`/`201` | Lectura/actualización u creación exitosa |
| `400` | Datos inválidos o falta un campo |
| `401` | Sin token o inválido/expirado |
| `403` | Rol sin permiso, no es el dueño, o proveedor no aprobado |
| `404` | No existe |
| `409` | Conflicto que pudo causar otra persona: oferta ya aceptada, email ya existe |
| `422` | Regla de negocio violada con datos sintácticamente válidos: transición inválida, solicitud cerrada |
| `500` | Error interno. Nunca exponer el stack trace |

## JWT y headers del Gateway

El Gateway valida el token y agrega `X-User-Id`, `X-User-Roles`,
`X-User-Email`, `X-Correlation-Id`. Cada microservicio **lee** estos
headers pero además **valida la firma** con el mismo `JWT_SECRET`: si
alguien llega directo por la red Docker, no debe pasar sin validación
propia. `X-Correlation-Id` viaja por todo el flujo; si no viene, se genera.

## Versionado

Toda API nueva lleva `/api/v1` desde el inicio. Un cambio que rompe
compatibilidad va a `/v2`; agregar un campo opcional o un endpoint nuevo
sigue en `v1`.

## Eventos — el sobre (`docs/eventos.md`)

```json
{ "event_id": "uuid", "event_name": "OFFER_ACCEPTED", "version": 1,
  "occurred_at": "2026-11-10T14:35:12.000Z", "correlation_id": "uuid",
  "producer": "negociacion", "payload": { } }
```

- `event_id`: UUID único, es la llave de idempotencia.
- `occurred_at`: ISO 8601 UTC, cuándo pasó (no cuándo se consumió).
- Exchanges `topic` por agregado: `identity_events`, `part_request_events`,
  `offer_events`, `order_events`. `routing_key` = nombre del evento.

## Mapa de eventos del proyecto

```
Identidad       → USER_CREATED, SUPPLIER_PROFILE_SUBMITTED,
                  SUPPLIER_APPROVED, SUPPLIER_REJECTED
Negociación     → PART_REQUEST_CREATED, PART_REQUEST_STATUS_CHANGED,
                  OFFER_SUBMITTED, OFFER_ACCEPTED, OFFER_REJECTED
Pedidos         → ORDER_CREATED, ORDER_STATUS_CHANGED
```

`OFFER_ACCEPTED` dispara la creación del pedido y trae todo lo que Pedidos
necesita para no consultar a nadie (ver payload completo en
`docs/eventos.md`).

## Outbox e idempotencia (detalle en `docs/eventos.md`)

- **Outbox** en Negociación y Pedidos: el evento se inserta en la misma
  transacción que el cambio de negocio; un proceso aparte lo publica.
- **Idempotencia**: cola propia por consumidor
  (`<servicio>.<evento o área>`); se descarta si `event_id` ya está en
  `processed_events`; `ack` solo tras confirmar; si falla, `nack` sin
  reencolar → `<cola>.dlq`.

## Reglas de los eventos

1. Nombrados en pasado (`OFFER_ACCEPTED`, no `ACCEPT_OFFER`): son avisos,
   no órdenes.
2. Inmutables: para corregir, se publica otro evento. Un campo nuevo es
   compatible; quitar o renombrar exige `version: 2`.
3. *Fire-and-forget*: el productor no espera respuesta. Si necesitas
   respuesta inmediata, usa HTTP.
4. Los consumidores son idempotentes (RabbitMQ entrega al menos una vez).

## Tipos compartidos

`packages/shared/` solo para **contratos y tipos** (enums, formas de
payload), nunca lógica de negocio. Compartir lógica es cómo un monorepo se
vuelve un monolito disfrazado de microservicios.

## Al modificar un contrato

- [ ] ¿Está documentado en `docs/contratos-api.md` o `docs/eventos.md`?
- [ ] ¿Avisaste al otro integrante?
- [ ] ¿Es compatible o rompe algo existente? Si rompe, ¿versionas en vez de
      editar?
- [ ] ¿Los consumidores actuales del evento manejan el payload nuevo?
