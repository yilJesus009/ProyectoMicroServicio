# Defensa — Fase 3, Cierre de la solicitud y avisos de pedidos (bloque A2)

## Qué se hizo

**Negociación** — consume `ORDER_STATUS_CHANGED` (cola propia
`negociacion.order_status_changed`, con `dlx`/`.dlq`, igual convención que
`negociacion.supplier_events`):
- Si `new_status` no es `COMPLETED`, el evento es informativo para este
  servicio: se marca `processed_events` y no se hace nada más.
- Si es `COMPLETED`: la solicitud pasa de `OFFER_ACCEPTED` a `COMPLETED`
  (transición ya legal en la máquina de estados desde la fase 2) y se
  encola `PART_REQUEST_STATUS_CHANGED` por outbox, en la misma transacción.

**Notificaciones** — dos bindings nuevos en la misma cola
`notificaciones.all` (`ORDER_CREATED`, `ORDER_STATUS_CHANGED` del exchange
`order_events`; no hizo falta tocar el consumidor, solo `contracts.js`,
que ya es la fuente de verdad de los bindings):
- `ORDER_CREATED` → al comprador ("Tu pedido de 480 BOB está listo para
  pagar", a `/comprador/pedidos/{id}/pago`) y al proveedor ("Se generó el
  pedido #id de tu oferta aceptada", a `/proveedor/pedidos`).
- `ORDER_STATUS_CHANGED` → un solo destinatario, decidido por la
  transición (sin necesitar `changed_by`): pagar avisa al proveedor,
  cualquier avance del proveedor avisa al comprador, confirmar recepción
  avisa al proveedor.

## El patrón que vale explicar: idempotencia de negocio, no solo de event_id

`processed_events` ya evita aplicar el mismo `event_id` dos veces (el
reintento normal de RabbitMQ). Pero hay un caso más: si Pedidos
reenviara el *mismo* `ORDER_STATUS_CHANGED=COMPLETED` con un `event_id`
**nuevo** (por ejemplo, reprocesando su propio outbox), el chequeo de
`event_id` no lo detendría — y ahí importa que `ApplyOrderStatusChanged`
primero pregunte si la solicitud **ya está** `COMPLETED` antes de tocar
nada: si ya lo está, no es un error, simplemente no hay nada que volver a
completar ni a publicar. Es el mismo patrón que el `offer_id` duplicado en
Pedidos (fase 3, entrega 1) y el `uq_payments_order_id` de la entrega 2,
aplicado ahora sin necesitar un índice único — alcanza con mirar el
estado actual antes del compare-and-swap.

Si la solicitud estuviera en un estado desde el que `COMPLETED` **no** es
una transición legal (por ejemplo `CANCELLED`), eso sí es una
inconsistencia real entre los dos servicios: se deja que explote, el
mensaje va a la `.dlq` y queda para revisar a mano — no se silencia.

## El mensaje de DELIVERED pide la acción (ajuste del equipo, 2026-11-10)

De los cinco avisos de `ORDER_STATUS_CHANGED`, el de `DELIVERED` es el
único que depende de que el comprador haga algo: si no confirma la
recepción, el pedido nunca llega a `COMPLETED` y la solicitud tampoco.
Por eso el mensaje no es solo informativo ("fue entregado") sino que pide
la acción explícitamente: **"Tu pedido #id fue entregado. Confírmalo
para cerrar la compra."**

## Cómo se probó

- **9 pruebas unitarias nuevas en Negociación** (98 en total,
  `node --test`): `ApplyOrderStatusChanged` (completa y publica,
  `new_status` distinto de `COMPLETED` no toca nada, idempotente por
  `event_id`, `COMPLETED` repetido con otro `event_id` no completa dos
  veces, estado inconsistente relanza) y el consumidor (sin `event_id` →
  nack sin invocar la lógica).
- **9 pruebas unitarias nuevas en Notificaciones** (41 en total): las 5
  combinaciones de `ORDER_STATUS_CHANGED` en `buildNotificationForEvent`
  (incluida la del mensaje de `DELIVERED` pidiendo confirmar, con el
  texto exacto) y `ORDER_CREATED` con sus dos destinatarios en
  `ApplyNegotiationEvent`.
- **Verificación real en Docker, con base limpia** (`down -v && up
  --build`): el flujo completo por el Gateway — publicar, ofertar
  (`delivery_type: DELIVERY`, para probar la rama `IN_TRANSIT`), aceptar,
  pagar, avanzar, entregar, confirmar — sin tocar la base a mano en
  ningún paso, verificando en cada uno el aviso real vía
  `GET /notifications/mine` con el token de quien debía recibirlo:
  1. Al crear el pedido: el comprador recibió "Tu pedido de 480 BOB está
     listo para pagar" y el proveedor "Se generó el pedido #1...".
  2. Al pagar: el proveedor recibió "El comprador pagó el pedido #1:
     prepáralo."
  3. Al avanzar a `IN_TRANSIT`: el comprador recibió "Tu pedido #1 va en
     camino."
  4. Al pasar a `DELIVERED`: el comprador recibió "Tu pedido #1 fue
     entregado. Confírmalo para cerrar la compra." (se verificó el texto
     exacto, no solo que llegó un aviso).
  5. Al confirmar la recepción: el proveedor recibió "El comprador
     confirmó la recepción del pedido #1", **y** `GET /part-requests/1`
     devolvió `status: "COMPLETED"`.
  6. Las colas `negociacion.order_status_changed` y `notificaciones.all`
     (y sus `.dlq`) quedaron en 0 mensajes — nada se rechazó.

## Sin columnas nuevas

Ni `part_requests` (ya tenía `COMPLETED` en su máquina de estados desde
la fase 2) ni `notifications` (ya es genérica: `user_id`, `role`, `type`,
`title`, `message`, `link`) necesitaron una columna nueva — confirmado
antes de escribir código, como pidió el equipo.

## Limitaciones

- La carrera "dos `ORDER_STATUS_CHANGED=COMPLETED` casi simultáneos para
  la misma solicitud" se probó con el compare-and-swap en un repositorio
  falso (`applyOrderStatusChanged.test.js`), no con dos mensajes reales
  concurrentes contra Postgres — mismo nivel de prueba que el resto de
  los compare-and-swap de este proyecto.
- El bloque B1 (pantallas de Angular para pago y seguimiento) sigue
  pendiente: esta fase solo cubre el backend de Pedidos, Negociación y
  Notificaciones.
