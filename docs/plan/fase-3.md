# Fase 3 — Pedidos y pantallas del flujo (martes 10 y miércoles 11)

**Objetivo:** el flujo completo funciona desde Angular: aceptar, pagar, seguir
el pedido y cerrar la solicitud.

---

## Bloque A — Prompt A1: Pedidos completo

```
Lee AGENTS.md, docs/contratos-api.md (Pedidos), docs/eventos.md,
docs/flujo-principal.md (estados del pedido), docs/modelo-datos.md (esquema
pedidos) y las skills spring-backend, api-contracts-events y testing-quality.

Fase 3, bloque A1 (apps/pedidos):
1. Consumidor de OFFER_ACCEPTED (cola pedidos.offer_accepted, Spring AMQP):
   idempotente con processed_events y offer_id único. Crea el pedido con un
   OrderFactory a partir del payload, en PENDING_PAYMENT, con su historial.
2. Estados con patrón State: cada estado sabe a cuáles puede pasar. El
   siguiente estado después de PREPARING se decide con Strategy según
   delivery_type (DELIVERY → IN_TRANSIT, PICKUP → READY_FOR_PICKUP).
   Transición inválida → 422; rol o dueño incorrecto → 403.
3. Pago simulado: interfaz PaymentGateway y adaptador
   SimulatedPaymentGateway que aprueba siempre y genera la referencia
   PAY-AAAAMMDD-NNNNNN. POST /orders/{id}/payment con method QR o CARD.
   No recibir ni guardar datos de tarjeta.
4. Endpoints: mine, supplier, {id} con historial y pago, by-offer/{offerId},
   payment, status, confirm-receipt.
5. Eventos por outbox: ORDER_CREATED y ORDER_STATUS_CHANGED (con buyer_id,
   supplier_id y part_request_id).
6. Pruebas: transiciones válidas e inválidas para entrega y retiro, el mismo
   OFFER_ACCEPTED dos veces crea un solo pedido, roles.

Muéstrame el plan antes de escribir código. Si es largo, divídelo en dos
entregas: primero consumidor y estados, después pago y eventos.
Terminado cuando, en Docker, aceptar una oferta crea el pedido y se puede
llevar hasta COMPLETED por el gateway. Al final escribe
docs/defensa/fase-3-pedidos.md: explica State, Strategy, Factory y Adapter
con este pedido como ejemplo.
```

## Bloque A — Prompt A2: Cierre de la solicitud y avisos de pedidos

```
Lee AGENTS.md, docs/eventos.md y la skill express-backend.

Fase 3, bloque A2:
1. apps/negociacion: consume ORDER_STATUS_CHANGED (cola
   negociacion.order_status_changed, idempotente). Si new_status es
   COMPLETED, la solicitud pasa de OFFER_ACCEPTED a COMPLETED y se publica
   PART_REQUEST_STATUS_CHANGED por outbox. Pruebas.
2. apps/notificaciones: bindea ORDER_CREATED y ORDER_STATUS_CHANGED.
   ORDER_CREATED → al comprador ("Tu pedido está listo para pagar") y al
   proveedor. ORDER_STATUS_CHANGED → a la otra parte de quien hizo el cambio,
   con el estado en español. Pruebas.

Muéstrame el plan antes de escribir código.
Terminado cuando, al confirmar la recepción, la solicitud queda COMPLETED y
cada cambio genera su aviso. Al final escribe docs/defensa/fase-3-cierre.md.
```

---

## Bloque B — Prompt B1: Pantallas del flujo

```
Lee AGENTS.md, docs/frontend.md (incluida la pantalla de pago simulado),
docs/contratos-api.md y la skill angular-frontend.

Fase 3, bloque B1 (apps/frontend):
1. Comprador:
   - /comprador/solicitudes/:id: detalle y comparador de ofertas
     (OfferCardComponent dumb, orden por precio o días), aceptar con diálogo
     de confirmación y mensaje del backend si responde 409 o 422.
   - Después de aceptar: "Generando tu pedido…" consultando
     GET /orders/by-offer/{offerId} cada 2 s; luego ir al pago.
   - /comprador/pedidos/:id/pago: pantalla de pago simulado con pestañas QR y
     tarjeta, exactamente como docs/frontend.md. Los datos de la tarjeta
     nunca se envían.
   - /comprador/pedidos y /comprador/pedidos/:id con línea de tiempo y botón
     "Confirmar recepción".
2. Proveedor:
   - /proveedor/solicitudes/:id/ofertar: formulario de oferta.
   - /proveedor/ofertas: mis ofertas, reutilizando OfferCardComponent, con
     botón retirar.
   - /proveedor/pedidos: avanzar estado con el botón que corresponde a
     entrega o retiro.

Muéstrame el plan antes de escribir código.
Terminado cuando el flujo completo (publicar, ofertar, aceptar, pagar,
despachar, entregar, confirmar) se puede hacer desde http://localhost:4200
con dos navegadores (comprador y proveedor). Al final escribe
docs/defensa/fase-3-frontend.md.
```

## Terminado cuando (fase completa)

- [ ] Todo el flujo de `docs/flujo-principal.md` funciona desde Angular, en Docker.
- [ ] La solicitud termina en `COMPLETED` y el pedido en `COMPLETED`.
- [ ] Cada paso genera su aviso.
