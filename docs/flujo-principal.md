# Flujo principal

> Si este flujo no funciona de punta a punta dentro de Docker, el proyecto no
> está terminado, sin importar cuántas pantallas existan.

## Recorrido completo

| # | Quién | Acción | Servicio | Resultado | Evento |
|---|---|---|---|---|---|
| 1 | Cualquiera | Se registra e inicia sesión | Identidad | Recibe su JWT | `USER_CREATED` |
| 2 | Proveedor | Completa su perfil comercial | Identidad | Perfil `PENDING` | `SUPPLIER_PROFILE_SUBMITTED` |
| 3 | Admin | Aprueba al proveedor | Identidad | Perfil `APPROVED` | `SUPPLIER_APPROVED` |
| 4 | Comprador | (Opcional) registra su vehículo | Catálogo | Vehículo guardado | — |
| 5 | Comprador | Publica una solicitud | Negociación | Solicitud `PUBLISHED` | `PART_REQUEST_CREATED` |
| 6 | Proveedor | Ve solicitudes abiertas y envía una oferta | Negociación | Oferta `SUBMITTED`; solicitud `RECEIVING_OFFERS` | `OFFER_SUBMITTED` |
| 7 | Comprador | Compara ofertas y **acepta una** | Negociación | Una `ACCEPTED`, las demás `REJECTED`; solicitud `OFFER_ACCEPTED` | `OFFER_ACCEPTED`, `OFFER_REJECTED` |
| 8 | (automático) | Se crea el pedido | Pedidos | Pedido `PENDING_PAYMENT` | `ORDER_CREATED` |
| 9 | Comprador | Paga con QR o tarjeta (simulado) | Pedidos | Pedido `PREPARING` | `ORDER_STATUS_CHANGED` |
| 10 | Proveedor | Despacha o deja listo para retiro | Pedidos | `IN_TRANSIT` o `READY_FOR_PICKUP` | `ORDER_STATUS_CHANGED` |
| 11 | Proveedor | Marca entregado | Pedidos | `DELIVERED` | `ORDER_STATUS_CHANGED` |
| 12 | Comprador | Confirma la recepción | Pedidos | `COMPLETED` | `ORDER_STATUS_CHANGED` |
| 13 | (automático) | Se completa la solicitud | Negociación | Solicitud `COMPLETED` | `PART_REQUEST_STATUS_CHANGED` |

En cada evento, **Notificaciones** crea el aviso para quien corresponda.

## Estados

### Solicitud (Negociación)

```
PUBLISHED ──(primera oferta)──► RECEIVING_OFFERS ──(acepta una)──► OFFER_ACCEPTED ──(pedido COMPLETED)──► COMPLETED
    │                                 │
    └──────────(el dueño cancela)─────┴──► CANCELLED
```

| Desde | Hacia | Lo provoca |
|---|---|---|
| `PUBLISHED` | `RECEIVING_OFFERS` | Llega la primera oferta |
| `PUBLISHED`, `RECEIVING_OFFERS` | `OFFER_ACCEPTED` | El dueño acepta una oferta |
| `PUBLISHED`, `RECEIVING_OFFERS` | `CANCELLED` | El dueño cancela |
| `OFFER_ACCEPTED` | `COMPLETED` | Evento `ORDER_STATUS_CHANGED` con `COMPLETED` |

El comprador **nunca** puede poner `OFFER_ACCEPTED` ni `COMPLETED` a mano.

### Oferta (Negociación)

| Desde | Hacia | Lo provoca |
|---|---|---|
| `SUBMITTED` | `ACCEPTED` | El comprador la acepta |
| `SUBMITTED` | `REJECTED` | El comprador acepta otra |
| `SUBMITTED` | `WITHDRAWN` | El proveedor la retira (solicitud abierta) |

### Pedido (Pedidos) — patrón State + Strategy

```
PENDING_PAYMENT ──(pago)──► PREPARING ──┬─(DELIVERY)──► IN_TRANSIT ───────┬──► DELIVERED ──(comprador)──► COMPLETED
                                        └─(PICKUP)────► READY_FOR_PICKUP ─┘
```

| Desde | Hacia | Quién | Condición |
|---|---|---|---|
| `PENDING_PAYMENT` | `PREPARING` | Comprador | Al confirmar el pago |
| `PREPARING` | `IN_TRANSIT` | Proveedor | Solo si `delivery_type = DELIVERY` |
| `PREPARING` | `READY_FOR_PICKUP` | Proveedor | Solo si `delivery_type = PICKUP` |
| `IN_TRANSIT`, `READY_FOR_PICKUP` | `DELIVERED` | Proveedor | |
| `DELIVERED` | `COMPLETED` | Comprador | Confirma la recepción |

Cualquier otra transición devuelve **422**. Si el rol no corresponde, **403**.

### Perfil comercial (Identidad)

`PENDING` → `APPROVED` o `REJECTED`. Si un proveedor rechazado actualiza su
perfil, vuelve a `PENDING`.

## Casos que siempre deben probarse

- [x] Aceptar una oferta deja las demás en `REJECTED`.
      `apps/negociacion/test/application/offers.test.js` → `'AcceptOffer: acepta una oferta, rechaza las demas y la solicitud queda OFFER_ACCEPTED'`
- [x] Aceptar una segunda oferta de la misma solicitud devuelve **409**.
      `apps/negociacion/test/application/offers.test.js` → `'AcceptOffer: la SEGUNDA aceptacion da 409, no 422 (orden de las verificaciones)'`
- [x] Dos aceptaciones simultáneas: solo una gana (prueba con peticiones en paralelo).
      `scripts/prueba-concurrencia-aceptar.mjs` — no es parte de `npm test` (necesita Postgres real, no un repositorio falso). Se corre con la pila en Docker:
      ```bash
      docker compose up -d   # al menos postgres, rabbitmq, identidad, catalogo, negociacion, gateway
      node scripts/prueba-concurrencia-aceptar.mjs
      ```
      Lanza los dos `POST /offers/{id}/accept` exactamente a la vez contra Postgres real y verifica un `200`, un `409` y una sola oferta `ACCEPTED`. Se puede volver a correr las veces que haga falta.
- [x] Un proveedor no aprobado no puede ofertar (**403**).
      `apps/negociacion/test/application/offers.test.js` → `'SubmitOffer: proveedor no aprobado → ForbiddenException (403)'`
- [x] No se puede ofertar en una solicitud cancelada o con oferta aceptada (**422**).
      `apps/negociacion/test/application/offers.test.js` → `'SubmitOffer: solicitud CANCELLED → PartRequestNotAcceptingOffersException (422)'`
      (mismo chequeo de dominio para `OFFER_ACCEPTED`/`COMPLETED`: `apps/negociacion/test/domain/partRequest.test.js` → `'acceptsOffers: CANCELLED, OFFER_ACCEPTED y COMPLETED no aceptan ofertas'`)
- [x] El mismo `OFFER_ACCEPTED` recibido dos veces crea **un** pedido.
      `apps/pedidos/.../application/commands/CreateOrderFromOfferAcceptedTest.java` → `esIdempotenteConElMismoEventId()` (mismo `event_id`) y `offerIdDuplicadoConEventIdDistintoSeMarcaProcesadoSinCrearOtroPedido()` (mismo pedido, `event_id` distinto)
- [x] Un pedido `PICKUP` no puede pasar a `IN_TRANSIT` (**422**).
      `apps/pedidos/.../domain/enums/OrderStatusTest.java` → `retiroPasaPorListoParaRetiro()`
- [x] Solo el comprador confirma la recepción; solo el proveedor despacha.
      `apps/pedidos/.../application/commands/ConfirmReceiptTest.java` → `lanza403SiElActorNoEsElCompradorDueño()`
      `apps/pedidos/.../application/commands/AdvanceOrderStatusTest.java` → `lanza403SiElActorNoEsElProveedorDueño()`
- [x] Al completarse el pedido, la solicitud queda `COMPLETED`.
      `apps/negociacion/test/application/applyOrderStatusChanged.test.js` → `'new_status COMPLETED completa la solicitud y encola PART_REQUEST_STATUS_CHANGED'`
