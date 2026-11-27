# Defensa — Fase 1, Pedidos y Notificaciones (bloque A3)

## Qué se hizo

- **`apps/pedidos`** (Spring Boot 3, Java 21, Maven): esquema propio
  `pedidos` en el Postgres compartido, Flyway con la primera migración
  (`orders`, `order_status_history`, `payments`, `outbox_events`,
  `processed_events`), filtro JWT HS256 propio (sin Spring Security
  completo), `GET /health`. Al arrancar deja creados el exchange
  `offer_events` (topic, durable) y la cola `pedidos.offer_accepted`
  (durable), con su binding a la routing key `OFFER_ACCEPTED` — **sin
  consumidor todavía** (eso llega en la fase 3, cuando Pedidos cree el
  pedido desde `OFFER_ACCEPTED`).
- **`apps/notificaciones`** (Express, 4 capas): esquema propio
  `notificaciones`, tablas `notifications`, `suppliers` (copia local,
  vacía) y `processed_events`. `GET /api/v1/notifications/mine` y
  `/unread-count` **reales** (consultan la tabla, vacía porque nadie
  escribe ahí todavía — no hay datos hardcodeados). Al arrancar deja
  creada la cola `notificaciones.all` (durable) con un consumidor
  prendido, **sin bindings** (los agrega la fase 2, uno por evento).
- Ambos agregados a `docker-compose.yml`, mismo estilo que los demás
  servicios.

## El patrón que vale explicar: domain/ sin Spring ni JPA

En `pedidos`, esta fase no necesitó ninguna entidad JPA (no hay ningún
caso de uso todavía que lea o escriba `orders`): por eso no se creó
ninguna. Cuando la fase 3 cree `Order`, la entidad `@Entity` irá en
`infrastructure/persistence/` con un mapper hacia la clase de dominio
pura — el dominio nunca importa `jakarta.persistence`. Esto ya se aplicó
así en `catalogo` y `negociacion`.

**Flyway, no Hibernate, crea las tablas** (`spring.jpa.hibernate.ddl-auto:
validate`, nunca `update`): si alguna entidad futura no coincide con lo
que Flyway ya creó, la aplicación falla al arrancar en vez de alterar la
base en silencio.

## Un bug real que apareció y se corrigió: la cola que nunca se creaba

Al arrancar `pedidos` por primera vez en Docker, **la cola y el exchange
no aparecían en RabbitMQ** pese a estar declarados como `@Bean`. Causa:
Spring AMQP declara las colas/exchanges/bindings de forma **perezosa**,
recién cuando algo abre una conexión real al broker (un
`@RabbitListener`, o un `RabbitTemplate.send`). Sin ningún listener en
esta fase, esa conexión nunca se abría. Se corrigió con un
`ApplicationRunner` que llama `AmqpAdmin.declareExchange/declareQueue/
declareBinding` explícitamente al arrancar, forzando la conexión y la
declaración sin esperar a que exista un consumidor real.

Un segundo bug, en `notificaciones`: la conexión inicial a RabbitMQ falló
una vez (`ECONNREFUSED`) pese al `depends_on: rabbitmq healthy`, y el
código original solo lo intentaba una vez — la cola se quedaba sin crear
para siempre en ese contenedor. Se corrigió con un reintento con espera
(hasta 10 intentos, 2 s entre cada uno).

## Cómo se probó

- 8 pruebas (`mvn test`) en pedidos: el filtro JWT (rechaza sin token, con
  token inválido, acepta uno válido y deja los claims; excluye `/health`)
  y la configuración de RabbitMQ (cola durable, exchange topic durable,
  routing key `OFFER_ACCEPTED`).
- 9 pruebas (`node --test`) en notificaciones: dominio, las dos queries,
  el controller (envelope y mapeo `read`) y el mapeo del repositorio.
- **Verificación real completa**: `docker compose down -v && up --build`
  con los **8** contenedores (sin frontend todavía) — los 8 quedaron
  `healthy`, incluida la compilación de Maven dentro de Docker.
  `GET /api/v1/health` por el gateway mostró los **5** servicios `UP`
  (criterio exacto de "terminado" de la fase 1). Se confirmó en la API de
  RabbitMQ, con un arranque limpio desde cero: `pedidos.offer_accepted`
  (durable, binding real a `offer_events`/`OFFER_ACCEPTED`, no solo el
  binding implícito al exchange por defecto) y `notificaciones.all`
  (durable, con su consumidor).

## Limitaciones

- No se probó desde Angular (todavía no existe — bloque B2 de Jesús).
- Ninguno de los dos servicios tiene lógica de negocio real todavía:
  Pedidos crea el pedido en la fase 3; Notificaciones recibe sus
  bindings y genera avisos reales en la fase 2.
- `notificaciones.all` sigue sin bindings a propósito — por diseño de
  esta fase, no es un olvido.
