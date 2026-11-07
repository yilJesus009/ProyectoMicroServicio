# Arquitectura

## Vista general

```
                    Navegador
                        │
              ┌─────────┴─────────┐
              │ Frontend Angular  │ :4200 (expuesto)
              └─────────┬─────────┘
                        │ HTTP /api/v1/...
              ┌─────────┴─────────┐
              │  Gateway Express  │ :4000 (expuesto)
              │ valida JWT, enruta│
              └─────────┬─────────┘
     ┌─────────┬────────┼─────────┬──────────────┐
     ▼         ▼        ▼         ▼              ▼
┌─────────┐┌─────────┐┌────────┐┌────────┐┌──────────────┐
│Identidad││Negocia- ││Pedidos ││Catálogo││Notificaciones│
│ Django  ││ción     ││Spring  ││NestJS  ││Express       │
│ :5000   ││Express  ││Boot    ││:4004   ││:4005         │
│         ││:4001    ││:4003   ││        ││              │
└────┬────┘└────┬────┘└───┬────┘└───┬────┘└──────┬───────┘
     │          │         │         │            │
     └──────────┴─────────┴────┬────┴────────────┘
                               ▼
           ┌───────────────────────────────────────┐
           │ PostgreSQL "repuestosya"              │
           │ esquemas: identidad · negociacion ·   │
           │ pedidos · catalogo · notificaciones   │
           └───────────────────────────────────────┘

  Identidad, Negociación y Pedidos publican eventos ──► RabbitMQ ──►
  Negociación, Pedidos y Notificaciones los consumen
```

## Servicios

| Servicio | Framework | Puerto | Esquema | Publica | Consume |
|---|---|---|---|---|---|
| Gateway | Express | 4000 | — | — | — |
| Identidad | Django + DRF | 5000 | `identidad` | `USER_CREATED`, `SUPPLIER_PROFILE_SUBMITTED`, `SUPPLIER_APPROVED`, `SUPPLIER_REJECTED` | — |
| Negociación | Express | 4001 | `negociacion` | `PART_REQUEST_CREATED`, `PART_REQUEST_STATUS_CHANGED`, `OFFER_SUBMITTED`, `OFFER_ACCEPTED`, `OFFER_REJECTED` | `SUPPLIER_APPROVED`, `SUPPLIER_REJECTED`, `ORDER_STATUS_CHANGED` |
| Pedidos | Spring Boot | 4003 | `pedidos` | `ORDER_CREATED`, `ORDER_STATUS_CHANGED` | `OFFER_ACCEPTED` |
| Catálogo | NestJS | 4004 | `catalogo` | — | — |
| Notificaciones | Express | 4005 | `notificaciones` | — | `SUPPLIER_PROFILE_SUBMITTED`, `SUPPLIER_APPROVED`, `SUPPLIER_REJECTED`, `PART_REQUEST_CREATED`, `OFFER_SUBMITTED`, `OFFER_ACCEPTED`, `OFFER_REJECTED`, `ORDER_CREATED`, `ORDER_STATUS_CHANGED` |
| Frontend | Angular (nginx) | 4200 | — | — | — |

## Comunicación

| Tipo | Cuándo | Ejemplo |
|---|---|---|
| **HTTP vía Gateway** | El navegador pide o cambia algo | `POST /api/v1/offers/78/accept` |
| **HTTP interno** | Un servicio lee un dato de referencia una vez | Negociación consulta `GET /api/v1/categories/{id}` a Catálogo, reenviando el token del usuario |
| **Eventos (RabbitMQ)** | Avisar que algo ya pasó | `OFFER_ACCEPTED` → Pedidos crea el pedido |

**Regla:** si quien llama necesita una respuesta inmediata, es HTTP. Si es un
hecho ya ocurrido al que otros reaccionan, es un evento.

## Gateway

- Rutas por prefijo:

| Prefijo | Servicio |
|---|---|
| `/api/v1/auth`, `/api/v1/suppliers`, `/api/v1/admin/suppliers` | Identidad |
| `/api/v1/part-requests`, `/api/v1/offers` | Negociación |
| `/api/v1/orders` | Pedidos |
| `/api/v1/categories`, `/api/v1/vehicles`, `/api/v1/admin/categories` | Catálogo |
| `/api/v1/notifications` | Notificaciones |

- `POST /api/v1/auth/register` y `POST /api/v1/auth/login` son públicas; el
  resto exige JWT.
- Agrega `X-Correlation-Id` si no viene y lo reenvía.
- `GET /api/v1/health` devuelve el estado de los 5 servicios (útil en la
  defensa).
- Habilita CORS solo para el origen del frontend.

## JWT

- Lo emite Identidad (SimpleJWT, HS256, `JWT_SECRET` compartido).
- Claims: `user_id`, `email`, `rol` (`COMPRADOR`, `PROVEEDOR`, `ADMIN`).
- Cada servicio valida la firma y el rol por su cuenta.
- Si el proveedor está aprobado **no** va en el token: Negociación lo sabe
  por su copia local de proveedores (decisión D11).

## Base de datos

- `infra/postgres/init.sql` crea los 5 esquemas y 5 usuarios
  (`identidad_user`, `negociacion_user`, ...). Cada usuario es dueño de su
  esquema y tiene su `search_path` apuntando a él.
- Configuración por framework:

| Framework | Cómo se fija el esquema | Tablas |
|---|---|---|
| Django | `OPTIONS: {"options": "-c search_path=identidad"}` | migrations |
| Express (Sequelize) | `define: { schema: 'negociacion' }` o `searchPath` | `sync()` limitado a su esquema |
| Spring Boot | `spring.jpa.properties.hibernate.default_schema=pedidos` | Flyway |
| NestJS (TypeORM) | `schema: 'catalogo'` | sincronización o migrations |

## Docker

`docker-compose.yml` en la raíz:

| Contenedor | Imagen o build | Expuesto |
|---|---|---|
| `postgres` | `postgres:16-alpine` + `init.sql` | No |
| `rabbitmq` | `rabbitmq:3.13-management-alpine` | Solo la UI 15672, para la demo |
| `identidad` | `apps/identidad/Dockerfile` | No |
| `negociacion` | `apps/negociacion/Dockerfile` (volumen `uploads` para fotos) | No |
| `pedidos` | `apps/pedidos/Dockerfile` (multi-stage Maven → JRE) | No |
| `catalogo` | `apps/catalogo/Dockerfile` (multi-stage Node) | No |
| `notificaciones` | `apps/notificaciones/Dockerfile` | No |
| `gateway` | `apps/gateway/Dockerfile` | 4000 |
| `frontend` | `apps/frontend/Dockerfile` (build Angular → nginx) | 4200 |

- Todos usan `healthcheck` y `depends_on: condition: service_healthy`, para
  que ningún servicio arranque antes que la base o RabbitMQ.
- Dentro de Docker los servicios se llaman por nombre de contenedor
  (`http://pedidos:4003`).
- Variables en `.env` (copiado de `.env.example`).

## Patrones de diseño

| Patrón | Dónde | Para qué |
|---|---|---|
| API Gateway | `gateway` | Punto de entrada único y autenticación |
| Repository | todos los servicios | El dominio no conoce la base de datos |
| State | Pedidos (`Order`) | Cada estado decide a cuáles puede pasar |
| Strategy | Pedidos | Siguiente estado según entrega o retiro; método de pago QR o tarjeta |
| Factory | Pedidos | Construir el pedido desde el evento `OFFER_ACCEPTED` |
| Adapter | Pedidos (`SimulatedPaymentGateway`) | Pasarela de pago simulada e intercambiable |
| Observer / Pub-Sub | RabbitMQ | Desacoplar a quien produce de quien reacciona |
| Transactional Outbox | Negociación, Pedidos | No perder eventos |
| Facade | Angular | Los componentes smart no conocen HTTP |
| Smart / Dumb components | Angular | Separar lógica de presentación |
