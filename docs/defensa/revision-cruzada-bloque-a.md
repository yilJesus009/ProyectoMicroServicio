# Revisión cruzada — Bloque A (Negociación, Pedidos, Notificaciones, Catálogo)

> Fase 5. Revisión de Jesús sobre el bloque de Dylan, con la skill
> `code-review-security` contra `AGENTS.md` y `docs/`. **No se corrigió
> nada en `apps/negociacion`, `apps/pedidos`, `apps/notificaciones` ni
> `apps/catalogo`** — son correcciones para que las aplique Dylan.

## Resumen

**0 bloqueantes, 8 opcionales, 5 notas.** La regla crítica está intacta en
sus tres capas (índice `UNIQUE` parcial, transacción con
`SELECT ... FOR UPDATE` y excepción → 409), verificada en código y con su
prueba explícita pasando. Cada servicio solo toca su propio esquema, todos
validan el JWT por su cuenta, el pago jamás ve datos de tarjeta, los
consumidores son idempotentes con `processed_events` y todas las
respuestas usan el sobre `{status, msg, data}` sin stack traces.

Ejecutado durante la revisión: `node --test` en Negociación → **98/98
pass**. Los 3 primeros opcionales se confirmaron con **peticiones en vivo**
contra Docker (los resultados están en cada hallazgo). El resto se
verificó por lectura de código con archivo y línea.

## Hallazgos

### 1. IDs no numéricos → 500 (verificado en vivo) — opcional, más visible

**Archivo:** `apps/negociacion/src/presentation/http/partRequest.controller.js:90,102,120` y `offer.controller.js:46,61,81,92`

**Problema:** `Number(req.params.id)` sin validar. En vivo:
`GET /api/v1/part-requests/abc` → **500**
(`{"status":500,"msg":"Error interno del servidor"}`) en vez de 400/404.

**Cómo corregirlo:** validar `Number.isInteger(id) && id > 0` en el DTO de
ruta → `ValidationException` (400) o 404 antes de tocar el repositorio.

### 2. `msg` como array en inglés en validaciones del Catálogo (verificado en vivo)

**Archivo:** `apps/catalogo/src/presentation/http/http-exception.filter.ts:33-34`

**Problema:** `POST /admin/categories {"name":""}` → 400 pero
`msg: ["name should not be empty"]` (array, en inglés) — viola
`docs/convenciones.md:42` (msg string, en español).

**Cómo corregirlo:** unir el array a un solo string en español, o
`exceptionFactory` del `ValidationPipe` con mensajes propios.

### 3. JSON malformado → 500 en vez de 400 (verificado en vivo)

**Archivo:** `apps/notificaciones/src/presentation/http/errorHandler.js:8-15` y `apps/catalogo/src/presentation/http/http-exception.filter.ts:39-40`

**Problema:** body `{mal` → **500** "Error interno del servidor"; el
contrato (`docs/convenciones.md:52`) pide 400 "Datos inválidos o falta un
campo".

**Cómo corregirlo:** respetar `err.status`/`statusCode` 4xx antes del
`?? 500`.

### 4. Respuestas del Catálogo en `camelCase`

**Archivo:** `apps/catalogo/src/presentation/http/response.util.ts:2-4`
(+ `category.mapper.ts:7`, `vehicle.mapper.ts:7`)

**Problema:** llegan `createdAt`/`ownerId` en vez de `created_at`/
`owner_id` (`docs/convenciones.md:44`). Impacto bajo: el frontend no lee
esos campos.

**Cómo corregirlo:** DTO de salida proyectado antes de `success()`.

### 5. DTO de Negociación sin límites → 500 de Postgres

**Archivo:** `apps/negociacion/src/presentation/http/dto.js:79-82, 44-48, 30-33`

**Problema:** `price` sin tope (rompe `numeric(10,2)`), textos sin
longitud máxima (`value too long`), `vehicle_year` sin rango (acepta
`-5`).

**Cómo corregirlo:** precio ≤ 99 999 999.99, longitud ≤ 255, año
1900–2030.

### 6. Subida de foto: sin magic bytes y archivo huérfano

**Archivo:** `apps/negociacion/src/presentation/http/upload.middleware.js:30` y `partRequest.controller.js:47-63`

**Problema:** solo se valida `mimetype` (controlado por el cliente); si el
caso de uso falla, el archivo queda huérfano en `uploads/requests/` (sin
`unlink` en los `catch`).

**Cómo corregirlo:** verificar la firma del archivo y borrarlo si la
creación no termina.

### 7. `X-User-Email` como respaldo del claim

**Archivo:** `apps/negociacion/src/presentation/http/auth.middleware.js:26` y `apps/notificaciones/src/presentation/http/auth.middleware.js:23`

**Problema:** `payload.email ?? req.headers['x-user-email']` acepta un
header no firmado (hoy no se usa el email, pero contradice AGENTS §4.5).

**Cómo corregirlo:** tomar `email` solo del payload del token.

### 8. Aprobación del proveedor leída fuera de la transacción

**Archivo:** `apps/negociacion/src/application/commands/submitOffer.js:34-37`

**Problema:** carrera con `SUPPLIER_REJECTED`: se insertaría una oferta de
un proveedor ya no aprobado.

**Cómo corregirlo:** releer el supplier con `{transaction}` dentro del
lock (como ya hace `withdrawOffer.js:37`).

## Notas (menores)

| # | Archivo:línea | Problema |
|---|---|---|
| 9 | `apps/negociacion/server.js:161-163`, `apps/catalogo/src/presentation/http/health.controller.ts:8` | `/health` devuelve `{service, status:'OK'}`; el contrato (`docs/contratos-api.md:134`) pide `{"status":"UP"}`. No rompe: el Gateway acepta ambos |
| 10 | `apps/notificaciones/src/infrastructure/persistence/notificationRepository.js:31-33` | `destinatarioWhere` con `role = null` generaría `role IS NULL` y podría devolver avisos ajenos (hoy imposible: Identidad siempre emite `rol`) — condicionar el OR del rol |
| 11 | `apps/pedidos/.../presentation/http/OrderController.java:15` | Import `presentation → infrastructure` (invierte la flecha de AGENTS §7; solo constantes de atributos del JWT) |
| 12 | `apps/pedidos/.../JwtAuthFilter.java:18-23`, `RabbitMqConfig.java:16-28`, `apps/notificaciones/server.js:111` (+ `applyNegotiationEvent.js:66`, `buildNotificationForEvent.js:12-13`, `supplier.model.js:7-8`) | Javadocs/comentarios **obsoletos**: "aún no hay endpoints protegidos", "sin consumidor", "7 bindings" (hoy 9). Peligro en la defensa oral |
| 13 | `apps/negociacion/server.js:82-84`, `apps/notificaciones/server.js:56-58` | Fallback `guest:guest` de AMQP en código (documentado en `.env.example`; mejor fallar al arrancar si falta la variable) |

## Hallazgo descartado

Un explorador afirmó que `sequelize.sync()` no crea el índice `UNIQUE`
parcial en una BD existente. **Es falso**: verificado en el código de
Sequelize (`node_modules/sequelize/lib/model.js:988-999` agrega los
índices faltantes sin condición). No se reporta como problema.

## Lo que se verificó explícitamente y está bien

- **Regla crítica (una sola oferta aceptada), sus 3 capas:**
  - Índice `UNIQUE` parcial — `apps/negociacion/src/infrastructure/persistence/offer.model.js:43-58`.
  - Transacción + `SELECT ... FOR UPDATE` — `…/persistence/partRequestRepository.js:112-115`.
  - `OfferAlreadyAcceptedException` → 409 — `…/domain/errors/index.js:149-154`,
    con prueba explícita en `apps/negociacion/test/application/offers.test.js:389,441`.
- **Esquemas ajenos:** cero. Cada servicio usa solo su esquema
  (`db.config.js`, `application.yml`, TypeORM `schema`) y no hay
  `sequelize.query`/SQL crudo en ningún servicio.
- **JWT propio por servicio:** firma verificada con `JWT_SECRET` en los 4,
  `requireRole`/`@Roles` en cada escritura y ownership en cada operación;
  Pedidos sin un solo uso de `X-User-Id`.
- **Pago simulado sin datos de tarjeta:** `PaymentRequest.java:27-30`
  rechaza cualquier campo que no sea `method` + `CHECK` en BD (probado en
  vivo en la fase 4: 400 con `card_number`).
- **Idempotencia + outbox:** `processed_events` con `event_id`, doble red
  por índice único, publicación solo tras commit con confirms (los 3
  servicios).
- **Sobre `{status,msg,data}`** en todos los controllers; **sin stack
  traces** en 500; **sin secretos** hardcodeados; **sin TODO** ni `catch`
  vacíos; **domain/ puro** en los 4 servicios; controllers delgados; un
  caso de uso por operación.

## Prioridad para Dylan

1. Hallazgo **1** (500 con ids no numéricos) — es el más visible en la
   demo y se arregla en un rato.
2. Hallazgos **2 y 3** (msg en inglés / JSON malformado → 500) — errores
   que un docente puede provocar escribiendo algo mal a propósito.
3. Hallazgos **4 a 8** — consistencia y robustez; ninguno rompe el flujo.
4. Notas **9 a 13** — cuando toque ese archivo; los comentarios viejos
   conviene pulirlos antes de la defensa oral.
