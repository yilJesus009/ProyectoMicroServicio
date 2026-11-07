# Defensa — Fase 1, Negociación (bloque A2)

## Qué se hizo

- **Estados renombrados** a los de `docs/flujo-principal.md`: `PUBLISHED`,
  `RECEIVING_OFFERS`, `OFFER_ACCEPTED`, `COMPLETED`, `CANCELLED`. Cambio de
  comportamiento real: ahora `RECEIVING_OFFERS`, `OFFER_ACCEPTED` y también
  `COMPLETED` quedan bloqueados para `PATCH .../status` (antes `COMPLETED`
  se podía poner a mano); los asigna un caso de uso interno o un consumidor
  de eventos, nunca el cliente.
- **Esquema propio** `negociacion` en el PostgreSQL compartido
  (`define: { schema: 'negociacion' }`).
- **Outbox real**: tablas `outbox_events` y `processed_events` (esta
  última solo creada; el primer consumidor llega en la fase 2). Crear una
  solicitud o cambiar su estado ya no publica directo a RabbitMQ: inserta
  el evento en `outbox_events` **en la misma transacción** que el cambio
  de negocio. Un proceso aparte (`outboxPublisherWorker.js`, cada 1.5 s)
  lee lo pendiente y lo publica de verdad, con confirmación del broker.
- **Sobre de eventos** con `event_id` (uuid) y `version`, como pide
  `docs/eventos.md`.
- `GET /health` y Dockerfile actualizados (`npm ci`).

## El patrón que vale explicar: por qué outbox y no publicar directo

Antes, crear una solicitud guardaba en la base y **además** mandaba un
mensaje a RabbitMQ en el mismo momento ("fire-and-forget"). El problema:
si el proceso se cae justo entre esas dos cosas, puede pasar que la base
tenga la solicitud pero el mensaje nunca haya salido — un evento perdido
que nadie va a reintentar.

El outbox evita eso convirtiendo "guardar la solicitud" y "anotar que hay
que avisar" en **una sola operación atómica**: la misma transacción de
Postgres. O se guardan las dos cosas, o no se guarda ninguna. Publicar de
verdad a RabbitMQ es un paso **aparte**, que un proceso en segundo plano
reintenta cada 1.5 segundos hasta lograrlo — así un RabbitMQ caído nunca
hace perder un evento, solo lo atrasa.

## La arquitectura limpia, en la práctica

`application/` no puede importar Sequelize (AGENTS.md §7). La transacción
entra por un puerto, `application/ports/unitOfWork.js` (interfaz
`IUnitOfWork.run(fn)`), implementado con Sequelize en
`infrastructure/persistence/sequelizeUnitOfWork.js`. El outbox se usa de
la misma forma: `domain/repositories/outboxRepository.js` es la interfaz,
igual que `partRequestRepository.js`; la implementación vive en
`infrastructure/`. El caso de uso (`ChangePartRequestStatus`,
`CreatePartRequest`) solo conoce esas dos interfaces — nunca sabe que hay
Postgres ni RabbitMQ detrás.

## Cómo se probó

- 27 pruebas (`node --test`), todas pasan. La más importante:
  **"si falla el guardado en outbox_events, la solicitud tampoco queda
  guardada"** — con un `FakeUnitOfWork` que simula un rollback real
  (commit/rollback sobre un borrador por transacción, no solo un mock que
  dice que sí).
- **Verificación real** con Postgres y RabbitMQ sueltos en contenedores
  (fuera de `docker-compose.yml`, destruidos al terminar):
  - Crear una solicitud deja una fila en `outbox_events`; el worker la
    publica y queda con `published_at`. Confirmado también escuchando el
    exchange `part_request_events` directamente: el mensaje llega
    persistente (`deliveryMode: 2`), con `event_id`, `version` y
    `producer`.
  - **El caso de la atomicidad, de verdad**: se le quitó el permiso de
    `INSERT` sobre `outbox_events` al usuario del servicio y se intentó
    crear una solicitud. Resultado: `500` genérico al cliente (sin
    exponer el error real), y el conteo de `part_requests` **no
    cambió** — la transacción completa se revirtió, tal como se diseñó.
  - Un bug real que apareció y se corrigió: el modelo de `outbox_events`
    tenía `createdAt: 'created_at'` en las opciones, lo que **renombra el
    atributo** en Sequelize (no solo la columna) y rompía el `ORDER BY`
    del worker. Se corrigió dejando que `underscored: true` haga el
    mapeo solo, igual que en `partRequest.model.js`.

## Limitaciones

- No se probó por el Gateway ni dentro de `docker-compose.yml` (el
  Postgres compartido con esquemas es del bloque B1 de Jesús, todavía no
  está).
- `processed_events` solo existe como tabla: el primer consumidor
  (copia de proveedores) llega en la fase 2.
- `npm audit`: 4 vulnerabilidades moderadas sin cambios (ver abajo),
  quedan para la fase 5 según lo acordado.

## `npm audit`

Se corrió `npm audit fix` (sin `--force`): no hizo ningún cambio. Razón:
`nodemon` (solo en `devDependencies`, no se usa en producción/Docker) ya
está en su última versión y declara `minimatch: ^10.2.1`; el parche real
de `minimatch` es la versión 11, pero npm no puede subir de major sin que
`nodemon` lo permita. No hay fix sin forzar algo. Lo de `uuid`/`sequelize`
(el otro hallazgo) queda para la fase 5, como se acordó.

## Bloque para `docker-compose.yml` (no aplicado todavía)

Igual que con Catálogo: el Postgres compartido con esquemas es del bloque
B1 y todavía no está. Este es el bloque listo para pegar cuando se avise,
**sin contraseñas por defecto** (si falta la variable, Docker Compose
debe fallar explícito, no arrancar con un valor adivinado):

```yaml
  negociacion:
    build: ./apps/negociacion
    container_name: marketplace-negociacion
    restart: unless-stopped
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_NEGOCIACION_USER: ${DB_NEGOCIACION_USER}
      DB_NEGOCIACION_PASSWORD: ${DB_NEGOCIACION_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
      RABBITMQ_USER: ${RABBITMQ_USER}
      RABBITMQ_PASS: ${RABBITMQ_PASS}
      NEGOCIACION_PORT: 4001
    volumes:
      - uploads_requests:/usr/src/app/uploads/requests
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
```

Necesita además `uploads_requests:` en la lista de `volumes:` de nivel
superior del archivo.
