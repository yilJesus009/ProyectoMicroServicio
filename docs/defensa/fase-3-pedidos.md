# Defensa — Fase 3, Pedidos (bloque A1)

> Esta fase se dividió en dos entregas (acordado con el equipo). Este
> documento cubre la **Entrega 1 — consumidor de `OFFER_ACCEPTED` y
> estados**. El pago simulado (Entrega 2) se documentará aparte cuando
> esté hecho.

## Qué se hizo

- **Consumidor de `OFFER_ACCEPTED`** (`pedidos.offer_accepted`, declarada
  en fase 1, sin tocar sus argumentos): un mensaje sin `event_id` o que no
  es JSON válido se rechaza **antes de tocar el payload** → va a
  `pedidos.offer_accepted.dlq`.
- **El pedido solo nace de ese evento** (`AGENTS.md` §4.3): `OrderFactory`
  (Factory) lo construye en `PENDING_PAYMENT`, con la primera fila del
  historial.
- **Estados del pedido** (`OrderStatus`, patrón **State**): cada estado
  sabe a cuáles puede pasar. La rama después de `PREPARING` no es fija —
  se la pregunta a `DeliveryType` (patrón **Strategy**: `PICKUP` va a
  `READY_FOR_PICKUP`, `DELIVERY` va a `IN_TRANSIT`), según cómo quedó la
  oferta aceptada.
- `PATCH /orders/{id}/status` (solo el proveedor dueño, solo
  `IN_TRANSIT`/`READY_FOR_PICKUP`/`DELIVERED` — `PENDING_PAYMENT →
  PREPARING` es del pago, Entrega 2) y `POST /orders/{id}/confirm-receipt`
  (solo el comprador dueño, solo si `DELIVERED`) encolan
  `ORDER_STATUS_CHANGED` por outbox, en la misma transacción que el
  cambio de estado y la fila del historial.
- `GET /orders/mine`, `/orders/supplier`, `/orders/{id}` y
  `/orders/by-offer/{offerId}` (este último, 404 también si el pedido es
  de otro comprador — no se distingue de "todavía no existe", para no
  filtrar si una oferta de otro fue aceptada).

## El patrón que vale explicar: el `offer_id` duplicado con otro `event_id`

RabbitMQ entrega **al menos una vez**. El caso normal de reintento ya está
cubierto por `processed_events` (mismo `event_id` → no hace nada). Pero si
Negociación llegara a reenviar el mismo `OFFER_ACCEPTED` con un
`event_id` **nuevo** (por ejemplo, reprocesando su propio outbox), el
`event_id` sería distinto y pasaría el primer chequeo — y ahí el índice
único de `offer_id` (`uq_orders_offer_id`) es la segunda red de
seguridad.

Esto obliga a separar el caso de uso en dos beans:

1. `OrderCreationTransaction` (`@Transactional`): pedido + marcar
   `processed_events` + encolar `ORDER_CREATED`, todo junto. Si el
   `INSERT` choca con `uq_orders_offer_id`, Spring revierte **toda** la
   transacción sola.
2. `CreateOrderFromOfferAccepted` (sin `@Transactional`, porque la
   auto-invocación no activa el proxy): llama al anterior; si capta un
   `DataIntegrityViolationException` cuyo mensaje nombra
   `uq_orders_offer_id`, no es un error — ya existe un pedido para esa
   oferta. Marca el `event_id` como procesado en una transacción **nueva**
   (la anterior ya se revirtió) y deja que el consumidor haga `ack`, sin
   ir a la dlq. Cualquier otro `DataIntegrityViolationException` se
   relanza igual.

El `ack` ocurre siempre después del `COMMIT`: el listener de Spring AMQP
solo confirma si el método retorna sin excepción, y el método ya hizo
commit antes de retornar.

## Dos ajustes que salieron al escribir la V2 de Flyway

- `part_description` era `varchar(255)` en la V1; una descripción de
  solicitud puede ser más larga. Se cambió a `text` — si no, el `INSERT`
  habría fallado, el mensaje habría ido a la dlq, y el pedido nunca se
  habría creado.
- `order_status_history.from_status` era `NOT NULL`; la primera fila del
  historial (pedido recién creado) no tiene "estado anterior". Se quitó
  el `NOT NULL`.

## Cómo se probó

- **33 pruebas unitarias** (JUnit 5 + Mockito + AssertJ, sin contexto de
  Spring): `OrderStatus.allowedNext`/`canTransitionTo` para las dos
  estrategias de entrega; `Order.changeStatus` (transición válida,
  inválida, dueño/visibilidad); `CreateOrderFromOfferAccepted` (crea el
  pedido, es idempotente con el mismo `event_id`, el `offer_id` duplicado
  con otro `event_id` se marca procesado sin crear otro pedido, y
  cualquier otro error de integridad se relanza); `AdvanceOrderStatus` y
  `ConfirmReceipt` (404, 403, 422, éxito con el evento encolado);
  `OfferAcceptedMessageHandler` (sin `event_id` o JSON inválido →
  `MalformedEventException` sin invocar el comando).
- **Verificación real en Docker** (`docker compose up --build` sobre la
  pila ya levantada; Flyway migró sola de v1 a v2 sin perder datos):
  1. Un `OFFER_ACCEPTED` que había quedado esperando en
     `pedidos.offer_accepted` **desde antes de que existiera este
     consumidor** se procesó solo al arrancar: la cola quedó en 0
     mensajes, la dlq en 0, y el pedido apareció en la tabla `orders`
     (`part_description` incluido, para confirmar la V2).
  2. Por el Gateway, con JWT real: `GET /orders/mine` devolvió el pedido
     con el sobre exacto del contrato.
  3. `PATCH /orders/1/status` con `{"status":"IN_TRANSIT"}` como
     proveedor dueño → `200`, historial con la nueva fila.
  4. `PATCH .../status` como el comprador (no el dueño) → `403`.
     `{"status":"NO_EXISTE"}` → `400`. Un body JSON mal formado → `400`
     (ver bug abajo). `POST .../confirm-receipt` con el pedido todavía en
     `IN_TRANSIT` → `422`.
  5. `DELIVERED` → `COMPLETED` por `confirm-receipt`: `200`, y un segundo
     intento de avanzar el estado dio `403` (ya no hay transición posible
     para el proveedor, y el chequeo de dueño/rol se hace antes del de
     transición).
  6. 4 eventos en el outbox (`ORDER_CREATED` + 3 `ORDER_STATUS_CHANGED`),
     todos con `published_at` lleno — confirmados contra RabbitMQ con
     `waitForConfirmsOrDie`.

## Un bug real que se corrigió de paso

Un body JSON mal formado en `PATCH /orders/{id}/status` caía al manejador
genérico (`500`) en vez de a uno específico. Se agregó
`@ExceptionHandler(HttpMessageNotReadableException.class)` → `400`, y se
confirmó en Docker antes y después del fix.

## Limitaciones de esta entrega

- No se puede llegar a `COMPLETED` por el Gateway de punta a punta
  todavía: `PENDING_PAYMENT → PREPARING` lo hace el pago simulado
  (Entrega 2, `POST /orders/{id}/payment`, pendiente). Para probar
  `AdvanceOrderStatus`/`ConfirmReceipt` en Docker se forzó ese único paso
  directo en la base de datos (solo para la prueba, no es código de
  producción).
- `ORDER_CREATED` y `ORDER_STATUS_CHANGED` se publican al exchange
  `order_events`, pero todavía no hay ninguna cola enganchada ahí:
  Negociación (cerrar la solicitud en `COMPLETED`) y Notificaciones son
  la Fase 3, bloque A2, que viene después de la Entrega 2 de pago.
