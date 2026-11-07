# Fase 1 — Esqueleto en Docker (sábado 7)

**Objetivo:** `docker compose up --build` levanta los 9 contenedores, todos
responden `/health` a través del Gateway y el login funciona desde Angular.

**Orden:** el bloque B empieza con Docker y la base (prompt B1). El bloque A
empieza por Catálogo (prompt A1) porque Angular (bloque B2) va a necesitar
las categorías más adelante; luego sigue con Negociación y con Pedidos y
Notificaciones. Los bloques pueden trabajar en paralelo; cada uno agrega sus
servicios al `docker-compose.yml` en su propio PR.

---

## Bloque B — Prompt B1: Docker, base de datos, Gateway e Identidad

```
Lee AGENTS.md, docs/arquitectura.md (secciones Base de datos, Docker y
Gateway) y la skill django-backend.

Fase 1, bloque B1:
1. Crea infra/postgres/init.sql: base repuestosya, los esquemas identidad,
   negociacion, pedidos, catalogo y notificaciones, y un usuario por esquema
   (identidad_user, ...) dueño de su esquema, sin permisos sobre los demás y
   con search_path apuntando a su esquema. Contraseñas desde variables de
   entorno o, si no es posible en init.sql, documentadas en .env.example.
2. Reescribe docker-compose.yml: postgres (con init.sql y healthcheck),
   rabbitmq (management, healthcheck, UI 15672 expuesta), identidad y gateway.
   Usa depends_on con condition: service_healthy. Solo el gateway (4000) se
   expone, además de la UI de RabbitMQ.
3. Identidad: conéctala al esquema identidad con su usuario (search_path en
   OPTIONS). Al arrancar en Docker: migrate y creación del admin desde
   ADMIN_EMAIL y ADMIN_PASSWORD si no existe. Agrega GET /health.
4. Gateway: rutas por prefijo según docs/arquitectura.md (5 servicios),
   GET /api/v1/health que consulta /health de cada servicio, CORS solo para
   http://localhost:4200, X-Correlation-Id.
5. Las pruebas existentes de identidad y gateway deben seguir pasando.

Muéstrame el plan antes de escribir código.
Terminado cuando docker compose up --build levanta postgres, rabbitmq,
identidad y gateway, y POST /api/v1/auth/login por el gateway devuelve un
token. Al final escribe docs/defensa/fase-1-infra.md (una página: qué se hizo,
por qué un esquema por servicio y cómo explicarlo).
```

## Bloque B — Prompt B2: Angular vacío

```
Lee AGENTS.md, docs/arquitectura.md, docs/frontend.md y la skill
angular-frontend.

Fase 1, bloque B2:
1. Crea apps/frontend con Angular (standalone + Angular Material): pantallas
   de login y registro contra el gateway, interceptor JWT, guards por rol y
   un layout con barra superior y menú distinto para COMPRADOR, PROVEEDOR y
   ADMIN (páginas vacías por ahora). Dockerfile: build y nginx en el 4200.
2. Agrega frontend al docker-compose.yml.

Muéstrame el plan antes de escribir código.
Terminado cuando en http://localhost:4200 puedo registrarme, iniciar sesión y
ver el menú de mi rol. Al final escribe docs/defensa/fase-1-frontend.md.
```

---

## Bloque A — Prompt A1: Catálogo con categorías

```
Lee AGENTS.md, docs/modelo-datos.md (esquema catalogo) y la skill
nest-backend.

Fase 1, bloque A1 (apps/catalogo):
1. Crea apps/catalogo con NestJS: TypeORM con esquema catalogo y su usuario,
   GET /health en el puerto 4004.
2. Entidad Category que precarga las 10 categorías de docs/modelo-datos.md
   si la tabla está vacía.
3. GET /api/v1/categories con validación de JWT.
4. Dockerfile multi-stage y el servicio agregado al docker-compose.yml.

Muéstrame el plan antes de escribir código.
Terminado cuando GET /api/v1/categories por el gateway devuelve las 10
categorías. Al final escribe docs/defensa/fase-1-catalogo.md.
```

## Bloque A — Prompt A2: Negociación al esquema y base de mensajería

```
Lee AGENTS.md, docs/modelo-datos.md (esquema negociacion), docs/eventos.md y
las skills express-backend y api-contracts-events.

Fase 1, bloque A2 (apps/negociacion):
1. Conéctalo al esquema negociacion con su usuario.
2. Renombra los estados de la solicitud a los de docs/flujo-principal.md
   (PUBLISHED, RECEIVING_OFFERS, OFFER_ACCEPTED, COMPLETED, CANCELLED) y
   ajusta pruebas.
3. Agrega las tablas outbox_events y processed_events, el proceso que publica
   el outbox cada 1-2 segundos con confirmación de RabbitMQ, y cambia la
   publicación actual para que use el outbox dentro de la misma transacción.
4. Agrega event_id y version al sobre de los eventos.
5. GET /health, Dockerfile actualizado y el servicio agregado al
   docker-compose.yml con volumen uploads para las fotos.

Muéstrame el plan antes de escribir código.
Terminado cuando las pruebas pasan, el servicio levanta en Docker y crear una
solicitud deja una fila en outbox_events que luego aparece publicada en
RabbitMQ. Al final escribe docs/defensa/fase-1-negociacion.md (explica el
outbox con palabras simples).
```

## Bloque A — Prompt A3: Pedidos y Notificaciones vacíos

```
Lee AGENTS.md, docs/arquitectura.md y las skills spring-backend y
express-backend.

Fase 1, bloque A3:
1. Crea apps/pedidos con Spring Boot 3 y Java 21 (Maven): estructura en capas
   (domain, application, infrastructure, presentation), JPA con
   default_schema pedidos, Flyway con la primera migración (orders,
   order_status_history, payments, outbox_events, processed_events según
   docs/modelo-datos.md), validación de JWT HS256 con JWT_SECRET,
   GET /health en el puerto 4003. Dockerfile multi-stage (Maven → JRE).
2. Crea apps/notificaciones con Express: esquema notificaciones, tablas
   notifications, suppliers y processed_events, validación de JWT,
   GET /health, GET /api/v1/notifications/mine y unread-count (vacíos por
   ahora), y un consumidor RabbitMQ con su cola notificaciones.all, aún sin
   bindings. Reutiliza el estilo de apps/negociacion.
3. Agrega ambos al docker-compose.yml.

Muéstrame el plan antes de escribir código.
Terminado cuando GET /api/v1/health por el gateway muestra los 5 servicios
UP. Al final escribe docs/defensa/fase-1-pedidos-notificaciones.md.
```

## Terminado cuando (fase completa)

- [ ] `docker compose down -v && docker compose up --build` levanta los 9 contenedores.
- [ ] `GET http://localhost:4000/api/v1/health` muestra los 5 servicios `UP`.
- [ ] Registro e inicio de sesión funcionan desde `http://localhost:4200`.
