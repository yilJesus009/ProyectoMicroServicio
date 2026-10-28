---
name: express-backend
description: Implementar y mantener los microservicios de negocio en Express con Sequelize (part-request, offer, order, catalog, notification). Estructura en capas, CQRS ligero, PostgreSQL y publicación/consumo de eventos RabbitMQ. Usar cuando se trabaja en apps/*-service/ excepto identity-service.
---

# Express Backend — Servicios de negocio

> Aplica a `part-request-service`, `offer-service`, `order-service`,
> `catalog-vehicle-service` y `notification-service`.
> Para el Identity Service (Django), usar `django-backend`.

## Antes de empezar

1. Leer `AGENTS.md`.
2. Leer `docs/convenciones.md` (secciones 3, 6 y 7).
3. Leer `docs/contratos-api.md` del endpoint que vayas a tocar.
4. Leer `docs/eventos.md` si vas a publicar o consumir eventos.
5. Leer `clean-architecture-ddd` para la teoría de capas.

## Estado actual y deuda técnica

El `part-request-service` tiene código base que hay que reestructurar.
**Problemas conocidos que hay que corregir:**

1. **El modelo y el servicio no coinciden.** El modelo define campos en
   camelCase con enums en inglés (`userId`, `vehicleBrand`, `PUBLISHED`), pero
   el servicio usa snake_case en español (`user_id`, `marca_vehiculo`,
   `PUBLICADA`). Elegir uno y unificar.

   > Decisión: **`snake_case` en la base de datos, `camelCase` en la API.**
   > Sequelize permite mapear con `field:`. Los enums quedan en inglés
   > (`PUBLISHED`, `ORDERED`) como están en `docs/`.

2. **Usa SQLite/MySQL.** Hay que migrar a **PostgreSQL** con la variable de
   entorno correspondiente (ver `.env.example`).

3. **No tiene las 4 capas.** Controllers, services y models están en la raíz.
   Hay que moverlos a `src/domain/`, `src/application/`, `src/infrastructure/`
   y `src/presentation/`.

4. **No publica eventos.** Debe publicar `PART_REQUEST_CREATED`.

**Refactorizar gradualmente, no reescribir desde cero.** El código existente
funciona en lo básico; muévelo a la estructura correcta sin perder el
comportamiento.

## Mapeo de columnas

```javascript
module.exports = (sequelize) => sequelize.define("PartRequest", {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId:        { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
  userEmail:     { type: DataTypes.STRING,  allowNull: false, field: "user_email" },
  vehicleBrand:  { type: DataTypes.STRING,  allowNull: false, field: "vehicle_brand" },
  vehicleModel:  { type: DataTypes.STRING,  allowNull: false, field: "vehicle_model" },
  vehicleYear:   { type: DataTypes.INTEGER, allowNull: false, field: "vehicle_year" },
  description:   { type: DataTypes.TEXT,    allowNull: false, field: "description" },
  city:          { type: DataTypes.STRING,  allowNull: false, field: "city" },
  urgency:       { type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH"), defaultValue: "MEDIUM", field: "urgency" },
  status:        { type: DataTypes.ENUM("PUBLISHED", "ORDERED", "COMPLETED", "CANCELLED"), defaultValue: "PUBLISHED", field: "status" },
  photo:         { type: DataTypes.STRING,  allowNull: true,  field: "photo" },
}, { tableName: "part_requests", timestamps: true, underscored: true });
```

`underscored: true` hace que `createdAt` se guarde como `created_at`.

## Configuración de base de datos

```javascript
// infrastructure/config/db.config.js
require("dotenv").config();
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_PART_REQUEST_NAME,
  process.env.DB_PART_REQUEST_USER,
  process.env.DB_PART_REQUEST_PASSWORD,
  {
    host: process.env.DB_PART_REQUEST_HOST,
    port: Number(process.env.DB_PART_REQUEST_PORT),
    dialect: "postgres",
    logging: false,
  }
);
module.exports = sequelize;
```

Cada servicio tiene **sus propias** variables. Un servicio jamás usa las
variables de otro.

## Publicar eventos

```javascript
// infrastructure/messaging/eventPublisher.js
class RabbitMQEventPublisher {
  constructor({ host, port, user, pass, producer }) { /* ... */ }

  async publish(topic, eventName, payload, correlationId) {
    // exchange tipo "topic", durable
    // routing_key = eventName
    // body = { event_name, occurred_at, correlation_id, producer, payload }
    // properties: delivery_mode = 2 (persistente)
  }
}
```

**Reglas:**
- **Publicar después de persistir**, dentro o justo después de la transacción.
- **El publish no puede romper la operación.** Envolver en `try/except` y
  loguear. Un fallo de RabbitMQ no impide crear una solicitud.
- El formato del mensaje está en `docs/eventos.md`. No se improvisa.

## Consumir eventos

```javascript
// infrastructure/messaging/eventConsumer.js
// - Declarar la cola con nombre propio: "<servicio>.<área>.<evento>"
//   Ej: order-service.order.created
// - exchange tipo "topic" con binding por routing_key
// - prefetch(1) para no saturar
// - ack solo DESPUÉS de procesar con éxito
// - idempotencia: registrar el mensaje procesado y saltar duplicados
```

**La cola es propia del consumidor**, así todos reciben el mismo evento sin
competir por él (patrón pub/sub). Ver `docs/eventos.md`, sección Colas y bindings.

## Consumir HTTP de otro servicio

Cuando un servicio necesita datos de otro, usar `application/ports/` como
interfaz e implementarla en `infrastructure/`:

```javascript
// application/partRequestClient.js  (interfaz)
class IPartRequestClient {
  async findById(id) { throw new Error('not implemented'); }
}

// infrastructure/http/partRequestHttpClient.js  (implementación)
class PartRequestHttpClient extends IPartRequestClient {
  async findById(id) {
    const { data } = await axios.get(
      `${process.env.PART_REQUEST_SERVICE_URL}/api/v1/part-requests/${id}`,
      { headers: { "x-service-token": process.env.SERVICE_TOKEN } }
    );
    return data.data;
  }
}
```

**Nunca** consultar la base de datos de otro servicio directamente.

## El índice UNIQUE que garantiza la regla crítica

En `offer-service`, el modelo debe crear este índice. Es la defensa final de
"una sola oferta aceptada":

```javascript
// infrastructure/persistence/migrations/xxxx-add-unique-accepted-offer.js
await sequelize.query(`
  CREATE UNIQUE INDEX IF NOT EXISTS uq_one_accepted_offer_per_request
    ON offers (request_id) WHERE status = 'ACCEPTED';
`);
```

Si dos peticiones concurrentes pasan la validación de aplicación, **una falla
aquí**. Esa es la diferencia entre una regla real y una regla decorativa.

## Manejo de errores

Un manejador global mapea errores de dominio a HTTP. Los controllers solo
llaman `next(err)`.

```javascript
// presentation/http/errorHandler.js
function errorHandler(err, req, res, next) {
  const map = {
    OfferAlreadyAcceptedException:    409,
    EmailAlreadyRegisteredException:  409,
    OfferNotFoundException:            404,
    PartRequestNotFoundException:      404,
    InvalidOrderTransitionException:  422,
    ForbiddenException:               403,
  };
  const status = map[err.name] ?? 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    status,
    msg: status === 500 ? "Error interno del servidor" : err.message,
    data: null,
  });
}
```

Nunca exponer el stack trace al cliente.

## Estructura de carpetas objetivo

```
src/
├── domain/
│   ├── entities/
│   ├── enums/
│   ├── errors/
│   └── repositories/
├── application/
│   ├── commands/
│   ├── queries/
│   └── ports/
├── infrastructure/
│   ├── persistence/
│   ├── messaging/
│   └── config/
├── presentation/
│   └── http/
└── server.js
```

## Comandos

```bash
npm install
npm run dev       # nodemon
npm start         # producción
npm test
```

## Reglas duras que aplican aquí

1. **Un servicio jamás consulta la base de otro.** Ni `JOIN`, ni migración.
2. **No importar entidades de otro microservicio.**
3. Todo puerto por **variable de entorno**, nunca hardcodeado.
4. Los controllers son **delgados**. Sin lógica de negocio.
5. Toda regla de negocio nueva tiene **prueba unitaria**.
6. Respuesta siempre `{status, msg, data}`.

## Al terminar

- `npm test` pasando.
- El servicio arranca con `npm run dev` y responde `/health`.
- Los eventos publicados se ven en la UI de RabbitMQ.
- Resumir: archivos modificados, pruebas realizadas, limitaciones.
