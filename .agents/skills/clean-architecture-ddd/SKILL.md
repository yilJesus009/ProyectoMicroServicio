---
name: clean-architecture-ddd
description: Organizar la lógica de negocio con DDD y arquitectura limpia en los microservicios de Express. Separar dominio, casos de uso, infraestructura y presentación, manteniendo los límites entre servicios. Usar cuando se crea o revisa la estructura interna de un microservicio de negocio (part-request, offer, order, catalog, notification).
---

# Clean Architecture + DDD

> Aplica a los servicios Express. Para el Identity (Django), ver también
> `express-backend` para las ideas de capas y `django-backend` para la
> implementación concreta.

## Antes de empezar

1. Leer `AGENTS.md`.
2. Leer `docs/convenciones.md`, sección 6 (arquitectura por microservicio).
3. Revisar la estructura existente del servicio. **No reescribir desde cero**
   si ya hay código funcional: reestructurar gradualmente es más seguro.
4. Identificar qué regla de negocio se está implementando.

## La regla de dependencia

```
presentation/http  →  application  →  domain
        ↑                  ↑              │
   infrastructure ─────────┘              │
        └─────────────────────────────────┘
```

- `domain/` **no importa** nada de Express, Sequelize, RabbitMQ ni de las
  demás capas. Sin `require('express')`, sin `require('sequelize')`.
- `application/` depende de `domain/`, nunca al revés.
- `infrastructure/` implementa los contratos que define `domain/`.
- `presentation/` solo orquesta.

**Si ves un `require` que apunta hacia afuera desde `domain/`, está mal.**

## Estructura objetivo

```
src/
├── domain/
│   ├── entities/        # Offer, PartRequest, Order, value objects
│   ├── enums/           # OfferStatus, OrderStatus, Condition, DeliveryType
│   ├── errors/          # OfferAlreadyAcceptedException, InvalidTransitionException
│   └── repositories/    # Interfaz IOfferRepository, IOrderRepository
├── application/
│   ├── commands/        # CreateOfferCommand + Handler
│   ├── queries/         # GetOffersByRequestQuery + Handler
│   └── ports/           # IEventPublisher, IPartRequestClient
├── infrastructure/
│   ├── persistence/     # SequelizeOfferRepository implementa IOfferRepository
│   ├── messaging/       # RabbitMQEventPublisher implementa IEventPublisher
│   └── config/          # db.config.js, env
├── presentation/
│   └── http/            # offer.controller.js, offer.routes.js
└── server.js
```

## Qué va en cada capa

### `domain/entities/`

Objetos con identidad y comportamiento. **Guardan la regla de negocio**, no
solo los datos.

```javascript
class Offer {
  constructor({ id, requestId, providerId, price, condition, status }) {
    if (price <= 0) throw new InvalidPriceException(price);
    this.id = id;
    this.requestId = requestId;
    this.providerId = providerId;
    this.price = price;
    this.condition = condition;
    this.status = status ?? OfferStatus.SUBMITTED;
  }

  // El comportamiento vive en la entidad, no en el controller
  accept() {
    if (this.status === OfferStatus.ACCEPTED) {
      throw new OfferAlreadyAcceptedException(this.requestId);
    }
    this.status = OfferStatus.ACCEPTED;
  }

  reject() {
    if (this.status === OfferStatus.ACCEPTED) {
      throw new AcceptedOfferCannotBeRejectedException(this.id);
    }
    this.status = OfferStatus.REJECTED;
  }
}
```

### `domain/repositories/`

**Interfaces, no implementaciones.** Definen lo que el dominio necesita, sin
saber cómo se cumple.

```javascript
// domain/repositories/offerRepository.js
class IOfferRepository {
  async findById(id) { throw new Error('not implemented'); }
  async findByRequestId(requestId) { throw new Error('not implemented'); }
  async findAcceptedByRequestId(requestId) { throw new Error('not implemented'); }
  async save(offer) { throw new Error('not implemented'); }
  // El bloqueo de fila es responsabilidad del adaptador
  async lockRequest(requestId, transaction) { throw new Error('not implemented'); }
}
module.exports = { IOfferRepository };
```

### `application/commands/`

Un comando = una escritura = un caso de uso. El handler orquesta.

```javascript
// application/commands/acceptOffer/acceptOfferCommandHandler.js
class AcceptOfferCommandHandler {
  constructor({ offerRepository, eventPublisher }) {
    this.offers = offerRepository;
    this.publisher = eventPublisher;
  }

  async execute({ offerId, actorId }) {
    // La transacción y el bloqueo viven aquí, no en la entidad
    return this.db.transaction(async (t) => {
      const offer = await this.offers.findById(offerId);
      if (!offer) throw new OfferNotFoundException(offerId);

      // Bloquea la fila de la solicitud: evita la condición de carrera
      await this.offers.lockRequest(offer.requestId, t);

      const existing = await this.offers.findAcceptedByRequestId(offer.requestId);
      if (existing) throw new OfferAlreadyAcceptedException(offer.requestId);

      offer.accept();                                   // regla de dominio
      await this.offers.save(offer, t);

      // Rechaza las demás en la MISMA transacción
      const others = await this.offers.findPendingByRequestId(offer.requestId);
      for (const other of others) {
        other.reject();
        await this.offers.save(other, t);
        await this.publisher.publish('offer_events', 'OFFER_REJECTED', { ... });
      }

      await this.publisher.publish('offer_events', 'OFFER_ACCEPTED', { ... });
      return offer;
    });
  }
}
```

### `application/queries/`

Solo leen. Pueden proyectar a otra vista sin tocar las entidades.

```javascript
class GetOffersByRequestQueryHandler {
  async execute({ requestId, actorId }) {
    const offers = await this.offers.findByRequestId(requestId);
    return offers.map(toOfferSummaryDto);   // proyección, no la entidad cruda
  }
}
```

### `presentation/http/`

Controllers **delgados**. Validan el DTO, llaman un caso de uso, devuelven
la respuesta. Sin `if` de reglas de negocio.

```javascript
// CORRECTO
exports.accept = async (req, res, next) => {
  try {
    const offer = await acceptOfferHandler.execute({
      offerId: Number(req.params.id),
      actorId: req.user.id,              // viene del header del Gateway
    });
    res.status(200).json({ status: 200, msg: 'Oferta aceptada', data: toDto(offer) });
  } catch (err) {
    next(err);                           // el manejador global mapea a HTTP
  }
};
```

```javascript
// INCORRECTO — lógica de negocio en el controller
exports.accept = async (req, res) => {
  const offer = await Offer.findByPk(req.params.id);
  if (offer.status === 'ACCEPTED') return res.status(409).json(...);  // ✗
  offer.status = 'ACCEPTED';                                           // ✗
  await offer.save();                                                  // ✗
};
```

## CQRS en la práctica

No hace falta una librería. Separa los casos de uso:

| Servicio | `commands/` | `queries/` |
|---|---|---|
| part-request | `CreatePartRequest`, `ChangePartRequestStatus` | `GetPartRequestById`, `SearchPartRequests` |
| offer | `SubmitOffer`, **`AcceptOffer`**, `RejectOffer` | `GetOffersByRequest`, `GetOffersByProvider` |
| order | `CreateOrder`, `ChangeOrderStatus`, `CancelOrder` | `GetOrderById`, `GetOrdersByBuyer` |

**Cuándo separar:** si una operación escribe y otra solo lee con distinto
perfil de carga, sepáralas. Si ambas son trivialmente iguales, no forces la
separación por cumplir un requisito formal: el PDF dice "donde resulte
pertinente".

## Patrones de diseño a aplicar

| Patrón | Dónde | Cómo justificarlo |
|---|---|---|
| **Adapter / Hexagonal** | `infrastructure/persistence/` | El dominio no depende de Sequelize; cambiar la BD no toca el dominio |
| **Strategy** | `offer-service` | La regla de aceptación puede variar según `delivery_type` |
| **Observer / Pub-Sub** | RabbitMQ | Desacople entre productor y consumidores |
| **Unit of Work** | `AcceptOfferCommandHandler` | Transacción atómica: aceptar + rechazar las demás |
| **Null Object** | `catalog-service` | Vehículo opcional sin `if (vehicle)` por todos lados |
| **Factory** | `order-service` | Construcción del pedido según tipo de entrega |
| **Decorator** | `api-gateway` | Capas de auth, logging y correlation-id encadenadas |

Si aplicas un patrón, **déjalo escrito en el PR**: el proyecto pide patrones
"aplicados y justificados".

## Límites entre servicios

- **Prohibido** importar entidades de otro microservicio.
- Si `order-service` necesita datos de la solicitud, los pide por HTTP a
  `part-request-service` o consume su evento.
- Los tipos compartidos van en `packages/shared/`, solo contratos y tipos,
  **nunca** lógica de negocio compartida. Ahí es donde un monorepo se vuelve
  un monolito disfrazado.

## Al terminar

- El `domain/` no tiene ningún `require` de infraestructura.
- Toda regla de negocio nueva tiene prueba unitaria.
- Los controllers no contienen `if` de reglas de negocio.
- Resumir: archivos modificados, capas tocadas, limitaciones.
