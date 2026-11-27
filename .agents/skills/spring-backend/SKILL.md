---
name: spring-backend
description: Implementar y mantener Pedidos en Spring Boot 3 (Java 21, Maven). JPA con esquema propio en el Postgres compartido, Flyway, Spring AMQP, outbox e idempotencia, pago simulado y seguimiento del pedido. Usar cuando se trabaja en apps/pedidos.
---

# Spring Backend — Pedidos

## Antes de empezar

1. Leer `AGENTS.md`, `docs/modelo-datos.md` (esquema `pedidos`) y
   `docs/flujo-principal.md` (estados del pedido).
2. Leer `docs/contratos-api.md` (Pedidos) y `docs/eventos.md`
   (`OFFER_ACCEPTED`, `ORDER_CREATED`, `ORDER_STATUS_CHANGED`).

## Responsabilidad

El pedido **solo nace** del evento `OFFER_ACCEPTED` — no existe un endpoint
que lo cree. Gestiona el pago simulado y el seguimiento hasta la entrega.

## Estructura en capas

```
src/main/java/.../pedidos/
├── domain/          Order, OrderStatus, excepciones, interfaces de repositorio
├── application/     commands (CreateOrder, ChangeOrderStatus, ConfirmPayment), queries
├── infrastructure/  JPA (persistence), Spring AMQP (messaging, outbox), config
└── presentation/    controllers delgados, DTOs
```

## Esquema propio (Flyway)

```yaml
# application.yml
spring:
  jpa:
    properties.hibernate.default_schema: pedidos
  flyway:
    schemas: pedidos
```

Primera migración (`V1__init.sql`): `orders`, `order_status_history`,
`payments`, `outbox_events`, `processed_events` (columnas en
`docs/modelo-datos.md`). Nunca editar una migración aplicada: crear una
nueva `V2__...`.

## Estados — patrón State + Strategy

```
PENDING_PAYMENT ──(pago)──► PREPARING ──┬─DELIVERY──► IN_TRANSIT ────┬──► DELIVERED ──(comprador)──► COMPLETED
                                        └─PICKUP───► READY_FOR_PICKUP ┘
```

`OrderStatus` decide a cuáles estados puede pasar (**State**); la
`Strategy` elige `IN_TRANSIT` o `READY_FOR_PICKUP` según `delivery_type`.
Cualquier transición fuera de esa tabla → `422`; rol incorrecto → `403`
(solo el proveedor despacha, solo el comprador confirma recepción).

## Factory: crear el pedido desde `OFFER_ACCEPTED`

El evento trae todo lo necesario (`docs/eventos.md`), así Pedidos no
consulta a Negociación:

```java
@RabbitListener(queues = "pedidos.offer_accepted")
public void onOfferAccepted(OfferAcceptedEvent event) {
  if (processedEvents.exists(event.eventId())) return;  // idempotencia
  Order order = OrderFactory.fromOfferAccepted(event);   // Factory
  orderRepository.save(order);
  processedEvents.markProcessed(event.eventId());
  outbox.enqueue("ORDER_CREATED", order.toPayload());
}
```

## Pago simulado — patrón Adapter

```java
public interface PaymentGateway { PaymentResult charge(PaymentMethod method, BigDecimal amount); }

@Component
public class SimulatedPaymentGateway implements PaymentGateway {
  public PaymentResult charge(PaymentMethod method, BigDecimal amount) {
    return new PaymentResult(generateReference(), Instant.now());  // nunca datos de tarjeta
  }
}
```

Solo se recibe `{ "method": "QR" | "CARD" }`. **Nunca** número de tarjeta
ni CVV, ni en el request ni en la base.

## Outbox e idempotencia

Igual patrón que Negociación (`docs/eventos.md`): insertar en
`outbox_events` **en la misma transacción** que el cambio; un
`@Scheduled` cada 1–2 s publica lo pendiente. Al consumir
`OFFER_ACCEPTED`, registrar `event_id` en `processed_events` antes de
`ack`. Publica `ORDER_STATUS_CHANGED` en cada transición; Negociación lo
consume para cerrar la solicitud cuando llega `COMPLETED`.

## JWT

Validar HS256 con `JWT_SECRET` compartido (filtro `OncePerRequestFilter`),
igual que los demás servicios. No confiar solo en los headers del Gateway.

## Comandos

```bash
mvn test
mvn spring-boot:run
```

## Reglas duras

1. Nunca consultar la base de otro servicio.
2. Nunca guardar datos reales de tarjeta.
3. Toda transición de estado válida solo según la tabla de
   `docs/flujo-principal.md`.
4. `GET /health` en el puerto 4003.

## Al terminar

`mvn test` pasando; `ORDER_CREATED` visible en RabbitMQ al simular
`OFFER_ACCEPTED`; migraciones Flyway commiteadas. Resumir archivos
modificados, pruebas realizadas, limitaciones.
