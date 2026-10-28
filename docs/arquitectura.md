# Arquitectura

## Vista general

```
                         ┌──────────────────────┐
        Browser ───────► │     API Gateway      │  puerto 4000
        (Angular:4200)   │  (valida JWT, inyecta │
                         │   X-User-Id / Roles)  │
                         └──────────┬───────────┘
                                    │ rutea por prefijo
      ┌──────────┬──────────┬───────┴────┬───────────┬──────────────┐
      ▼          ▼          ▼            ▼           ▼              ▼
 ┌─────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐
 │identity │ │ part-  │ │ offer  │ │  order   │ │ catalog  │ │notification│
 │ Django  │ │request │ │        │ │          │ │ vehicle  │ │            │
 │  :5000  │ │ :4001  │ │ :4002  │ │  :4003   │ │  :4004   │ │   :4005    │
 └────┬────┘ └───┬────┘ └───┬────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘
      │          │          │           │            │             │
      ▼          ▼          ▼           ▼            ▼             ▼
 identity   part_req     offer       order       catalog      notification
    _db         _db        _db         _db          _db            _db
  (5433)      (5434)     (5435)      (5436)       (5437)         (5438)
                                    ▲
                                    │ consume OFFER_ACCEPTED
                          ┌─────────┴─────────┐
                          │     RabbitMQ      │  5672 / 15672
                          │  bus de eventos   │
                          └───────────────────┘
```

## Decisiones arquitectónicas

### 1. API Gateway como punto de entrada único

Ningún microservicio se expone al exterior. Todo pasa por el Gateway (`4000`),
que hace dos cosas:

1. **Valida el JWT** que envía el navegador.
2. **Descompone el token en headers** que los servicios consumen:

```
X-User-Id:      12
X-User-Roles:   COMPRADOR
X-User-Email:   juan@taller.com
X-Correlation-Id: a1b2c3d4-...
```

**Importante** (lección del proyecto de referencia): el Gateway **no** debe
ser el único que valida la firma. Cada microservicio **también** valida el
token con el mismo `JWT_SECRET`. Así, si alguien alcanza un servicio
directamente (por ejemplo desde dentro de la red Docker), no se cola.

### 2. Microservicios stateless

Los servicios no guardan sesión. Reciben los headers confiables del Gateway
y confían en ellos. Cualquier instancia puede atender cualquier request.

### 3. DDD y arquitectura limpia

Cada servicio separa sus responsabilidades en 4 capas:

```
domain/         → la regla de negocio pura. Sin Express, sin Sequelize.
application/    → casos de uso: orquestan el dominio ante un comando.
infrastructure/ → adaptadores: base de datos, RabbitMQ, configuración.
presentation/   → HTTP: controllers delgados que solo llaman casos de uso.
```

La dependencia apunta hacia adentro: `presentation → application → domain`.
El `domain/` nunca importa de las capas de afuera.

### 4. CQRS (Command Query Responsibility Segregation)

Separar **escrituras** de **lecturas** donde sea pertinente. No hace falta un
patrón pesado: alcanza con separar los casos de uso.

```
application/
├── commands/     CreateOfferCommand + CreateOfferCommandHandler
│                 (valida reglas, escribe, publica evento)
└── queries/      GetOffersByRequestQuery + GetOffersByRequestQueryHandler
                  (solo lee, puede proyectar a otra vista)
```

**Dónde aplica en este proyecto:**

| Servicio | Commands | Queries |
|---|---|---|
| part-request | `CreatePartRequest`, `ChangePartRequestStatus` | `GetPartRequestById`, `SearchPartRequests` |
| offer | `SubmitOffer`, **`AcceptOffer`**, `RejectOffer` | `GetOffersByRequest`, `GetOffersByProvider` |
| order | `CreateOrder`, `ChangeOrderStatus`, `CancelOrder` | `GetOrderById`, `GetOrdersByBuyer` |

`AcceptOffer` es el command más delicado del proyecto: escribe y debe
garantizar que solo pase una vez.

### 5. Comunicación híbrida (HTTP + RabbitMQ)

| Tipo | Tecnología | Cuándo |
|---|---|---|
| **Síncrona** | HTTP | Consultas puntuales. El frontend pregunta por una solicitud. |
| **Asíncrona** | RabbitMQ | Hechos que ya ocurrieron. `OFFER_ACCEPTED` dispara `ORDER_CREATED`. |

**Regla:** si el emisor necesita una respuesta inmediata, es HTTP. Si es un
hecho del pasado que otros pueden reaccionar cuando quieran, es un evento.

### 6. Persistencia independiente

Cada microservicio tiene su **propia base PostgreSQL**. No hay bases compartidas.

- Un servicio **nunca** consulta la base de otro.
- Si necesita datos de otro servicio, los pide por HTTP o consume su evento.
- Cada servicio decide su propio modelo de datos y sus migraciones.

### 7. Patrones de diseño usados

| Patrón | Dónde | Por qué |
|---|---|---|
| **Gateway** | api-gateway | Punto único de entrada, autenticación centralizada |
| **Strategy** | offer-service | La regla de aceptación puede variar según tipo de entrega |
| **Observer / Pub-Sub** | RabbitMQ | Desacople entre quien produce y quien consume eventos |
| **Adapter (Hexagonal)** | todos | El dominio no depende de Sequelize ni de Express |
| **Unit of Work** | offer-service, order-service | Transacciones atómicas en operaciones críticas |
| **Null Object** | catalog-service | Vehículo opcional sin `if (vehicle)` por todos lados |
| **Factory** | order-service | Construcción del pedido según tipo de entrega |
| **Decorator** | api-gateway | Capas de auth, logging y correlation-id encadenadas |

## Flujo principal (el que evalúa el proyecto)

```
1. Solicitante publica una solicitud
     POST /api/v1/part-requests        (por el Gateway)
     → part-request-service persiste y publica PART_REQUEST_CREATED

2. Proveedor consulta y envía una oferta
     GET  /api/v1/part-requests?status=PUBLISHED
     POST /api/v1/offers
     → offer-service persiste y publica OFFER_SUBMITTED

3. Solicitante compara y acepta UNA oferta
     POST /api/v1/offers/78/accept
     → offer-service:
         a. bloquea la fila (SELECT ... FOR UPDATE)
         b. verifica que la solicitud no tenga ya una oferta aceptada
         c. si no tiene: acepta esta, rechaza las demás  (transacción atómica)
         d. publica OFFER_ACCEPTED
     → part-request-service recibe el evento, cambia estado a ORDERED

4. El pedido se genera
     order-service consume OFFER_ACCEPTED
     → crea el pedido en PENDING y publica ORDER_CREATED

5. Seguimiento hasta la finalización
     proveedor:  PENDING → PREPARING → SHIPPED → DELIVERED
     solicitante confirma → COMPLETED
     → cada cambio publica ORDER_STATUS_CHANGED
```

## La regla crítica: una sola oferta aceptada

Es el requisito más importante del proyecto. Se defiende en **tres capas**:

1. **Base de datos** — índice único parcial. Es la defensa final:
   ```sql
   CREATE UNIQUE INDEX uq_one_accepted_offer_per_request
     ON offers (request_id)
     WHERE status = 'ACCEPTED';
   ```
   Aunque dos requests concurrentes pasen la validación, una falla en el índice.

2. **Dominio** — el agregado `Offer` expone `accept()`, que lanza
   `OfferAlreadyAcceptedException` si la solicitud ya tiene oferta aceptada.

3. **Aplicación** — `AcceptOfferCommandHandler` abre una transacción y bloquea
   la fila de la solicitud antes de leer, evitando la condición de carrera.

**No se garantiza ocultando botones en el frontend.** El frontend solo
refleja el estado; la regla vive en el backend.

## Qué NO incluye este proyecto

- Pasarela de pagos real (la confirmación de compra se simula).
- Notificaciones push en tiempo real (el Notification Service es complementario).
- Valoraciones de proveedores y filtros avanzados: son opcionales y solo se
  abordan después de que el flujo principal funcione de punta a punta.
