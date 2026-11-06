---
name: express-backend
description: Implementar y mantener los microservicios de negocio en Express con Sequelize (negociacion, notificaciones). Arquitectura limpia por capas, esquema propio en el PostgreSQL compartido, outbox e idempotencia con RabbitMQ. Usar en apps/negociacion y apps/notificaciones. Para Identidad (Django) usar django-backend; para Catálogo (NestJS) usar nest-backend.
---

# Express Backend — Negociación y Notificaciones

## Antes de empezar

1. Leer `AGENTS.md` (secciones 3 a 7).
2. Leer `docs/convenciones.md` y `docs/modelo-datos.md` (esquema del
   servicio que vas a tocar).
3. Leer `docs/contratos-api.md` del endpoint que vayas a tocar.
4. Leer `docs/eventos.md` si vas a publicar o consumir eventos.

## Esquema propio en un Postgres compartido

No hay una base por servicio: hay **un** PostgreSQL (`repuestosya`) con un
esquema por servicio. Sequelize fija el esquema, nunca lee ni escribe en otro:

```javascript
// infrastructure/config/db.config.js
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_NEGOCIACION_USER,
  process.env.DB_NEGOCIACION_PASSWORD, {
    host: process.env.DB_HOST, port: process.env.DB_PORT, dialect: "postgres",
    schema: "negociacion", logging: false,
  });
```

Modelos: `sequelize.define("PartRequest", {...}, { schema: "negociacion",
tableName: "part_requests", underscored: true })`.

## Estructura en 4 capas (bajo `src/`)

```
domain/          entidades, enums, errores, interfaces de repositorio
application/     commands/, queries/, ports/ (interfaces hacia afuera)
infrastructure/  persistencia, messaging (publisher, consumer, outbox), config
presentation/    controllers delgados, dto, errorHandler
```

Un caso de uso por operación. Los controllers validan entrada, llaman el
caso de uso y responden; nunca contienen lógica de negocio.

## Nombres y tipos

`snake_case` en la base, `camelCase` en el código JS, `snake_case` en el
JSON de la API (`docs/convenciones.md` 2–3). Enums en inglés
(`PUBLISHED`, `RECEIVING_OFFERS`, `OFFER_ACCEPTED`); urgencia en español
(`BAJA`, `MEDIA`, `ALTA`) por excepción ya decidida.

## Outbox: publicar sin perder eventos

Negociación usa outbox (`docs/eventos.md`). En la **misma transacción** que
el cambio de negocio:

```javascript
await sequelize.transaction(async (t) => {
  await partRequest.update({ status: "RECEIVING_OFFERS" }, { transaction: t });
  await OutboxEvent.create({
    event_id: uuid(), event_name: "PART_REQUEST_STATUS_CHANGED", version: 1,
    occurred_at: new Date(), correlation_id, producer: "negociacion", payload,
  }, { transaction: t });
});
```

Un proceso aparte (cada 1–2 s) lee `published_at IS NULL`, publica con
confirmación de RabbitMQ y marca `published_at`. Si RabbitMQ está caído, el
evento espera en la tabla.

## Consumir sin duplicar (idempotencia)

Cola propia por consumidor (`negociacion.supplier_events`,
`notificaciones.all`). Por mensaje, en una transacción: si `event_id` ya
está en `processed_events`, descartar; si no, aplicar el efecto y guardar
el `event_id`. `ack` solo tras confirmar. Si falla: `nack` sin reencolar
→ a la `<cola>.dlq`.

## Consumir HTTP de otro servicio

Interfaz en `application/ports/`, implementación en `infrastructure/http/`,
reenviando el JWT del usuario (nunca llamando sin token):

```javascript
class CategoryHttpClient {
  async findById(id, token) {
    const { data } = await axios.get(`${process.env.CATALOGO_SERVICE_URL}/api/v1/categories/${id}`,
      { headers: { Authorization: `Bearer ${token}` } });
    return data.data;
  }
}
```

**Nunca** consultar la base de datos de otro servicio.

## La regla crítica (solo en Negociación)

```javascript
await sequelize.transaction(async (t) => {
  const request = await PartRequest.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
  if (request.status !== "RECEIVING_OFFERS") throw new PartRequestNotAcceptingOffersException();
  // ... aceptar la oferta, rechazar las demás, outbox
});
```

Respaldado por un índice `UNIQUE` parcial en `offers (part_request_id) WHERE
status = 'ACCEPTED'`: si dos peticiones concurrentes pasan la validación,
una falla ahí. Esa es la diferencia entre una regla real y una decorativa.

## Manejo de errores y respuesta HTTP

Un manejador global mapea errores de dominio a HTTP (`docs/convenciones.md`
4); los controllers solo llaman `next(err)`. Siempre responder
`{status, msg, data}`, `data: null` en errores, nunca exponer el stack.

## Comandos

```bash
npm install
npm run dev       # nodemon
npm start
npm test
```

## Reglas duras

1. Un servicio jamás consulta la base de otro.
2. Todo puerto o URL por variable de entorno.
3. Toda regla de negocio nueva tiene prueba unitaria.
4. `GET /health` siempre disponible.

## Al terminar

`npm test` pasando; el servicio responde `/health`; eventos visibles en la
UI de RabbitMQ. Resumir archivos modificados, pruebas y limitaciones.
