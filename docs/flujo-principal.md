# Flujo principal del negocio

> Este documento describe el ciclo completo que evalúa el proyecto.
> Si el flujo no funciona de punta a punta, el proyecto no está terminado,
> sin importar cuántos microservicios existan.

---

## El ciclo completo

```
┌─────────────────────────────────────────────────────────────────┐
│  1. PUBLICAR                                                    │
│     El solicitante (propietario o taller) describe qué         │
│     repuesto necesita: marca, modelo y año del vehículo,        │
│     descripción, fotografía, ciudad y nivel de urgencia.        │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. OFRECER                                                     │
│     Los proveedores revisan las solicitudes disponibles        │
│     y envían ofertas: precio, marca del repuesto, condición,   │
│     disponibilidad, tiempo de entrega e indican si se retira   │
│     o requiere entrega.                                        │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. COMPARAR Y ACEPTAR  ←←← LA REGLA CRÍTICA                   │
│     El solicitante compara las condiciones de las ofertas.     │
│     Acepta UNA SOLA. Las demás quedan como historial.          │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. GENERAR EL PEDIDO                                           │
│     Al aceptarse la oferta, se crea el pedido correspondiente. │
│     El solicitante pasa a ver su pedido en estado inicial.     │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. SEGUIR HASTA LA FINALIZACIÓN                                │
│     El proveedor actualiza: preparación → envío → entrega.     │
│     El solicitante confirma la finalización.                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Recorrido técnico paso a paso

### Paso 1 — Publicar la solicitud

```
Frontend (Angular)
  POST /api/v1/part-requests        (vía Gateway, con JWT)
        │
        ▼
api-gateway (:4000)
  valida el JWT → inyecta X-User-Id, X-User-Roles
        │
        ▼
part-request-service (:4001)
  valida que el rol sea COMPRADOR
  persiste la solicitud en PUBLISHED
  publica PART_REQUEST_CREATED en RabbitMQ
        │
        ├──► notification-service  (aviso: nueva solicitud)
        └──► los proveedores la ven con GET /api/v1/part-requests
```

### Paso 2 — Enviar una oferta

```
Proveedor
  GET  /api/v1/part-requests?status=PUBLISHED
  POST /api/v1/offers               (con request_id y condiciones)
        │
        ▼
offer-service (:4002)
  valida que el rol sea PROVEEDOR
  valida que la solicitud exista y esté PUBLISHED
  persiste la oferta en SUBMITTED
  publica OFFER_SUBMITTED
        │
        ├──► notification-service  (aviso al solicitante: nueva oferta)
        └──► el solicitante la ve con GET /api/v1/offers?request_id=34
```

### Paso 3 — Aceptar una oferta (la operación más delicada)

```
Solicitante
  POST /api/v1/offers/78/accept
        │
        ▼
offer-service (:4002)
  BEGIN TRANSACTION
    SELECT ... FROM part_requests WHERE id = 34 FOR UPDATE   ← bloquea
    ¿ya existe una oferta ACCEPTED para esta solicitud?
        SÍ → ROLLBACK, devuelve 409
        NO →
            UPDATE offers SET status='ACCEPTED'  WHERE id = 78
            UPDATE offers SET status='REJECTED'
              WHERE request_id = 34 AND id <> 78
  COMMIT
  publica OFFER_ACCEPTED
  publica OFFER_REJECTED por cada oferta descartada
        │
        ├──► part-request-service  (cambia la solicitud a ORDERED)
        ├──► order-service         (crea el pedido ← paso 4)
        └──► notification-service  (aviso al proveedor: oferta aceptada)
```

**La defensa en tres capas:**

```sql
-- 1. Base de datos: la defensa final. Aunque dos peticiones concurrentes
--    pasen la validación, una falla aquí.
CREATE UNIQUE INDEX uq_one_accepted_offer_per_request
  ON offers (request_id) WHERE status = 'ACCEPTED';
```

```javascript
// 2. Dominio: el agregado expone accept() y lanza su propia excepción.
accept() {
  if (this.status === 'ACCEPTED') throw new OfferAlreadyAcceptedException();
  this.status = 'ACCEPTED';
}
```

```javascript
// 3. Aplicación: el handler bloquea la fila antes de decidir.
async execute({ offerId }) {
  return this.db.transaction(async (t) => {
    const offer = await this.offers.findById(offerId, t);
    await this.requests.lock(offer.requestId, t);   // SELECT ... FOR UPDATE
    // ... validar y aceptar
  });
}
```

> El frontend **solo refleja** este estado. Si alguien llama al endpoint
> directamente dos veces, la segunda recibe `409`. Ahí vive la regla.

### Paso 4 — Generar el pedido

```
order-service (:4003) consume OFFER_ACCEPTED
  crea el pedido en PENDING
  publica ORDER_CREATED
        │
        ├──► notification-service  (aviso a ambas partes)
        └──► el solicitante ve su pedido con GET /api/v1/orders/12
```

> `order-service` **no** expone un endpoint que cree pedidos. Su única fuente
> es el evento `OFFER_ACCEPTED`. Esto impide pedidos "fantasma".

### Paso 5 — Seguimiento hasta la finalización

```
proveedor:  PENDING ─► PREPARING ─► SHIPPED ─► DELIVERED
                                    │
solicitante confirma ───────────────┴────────► COMPLETED

cualquiera de las dos partes, antes de SHIPPED ─► CANCELLED
```

```
PATCH /api/v1/orders/12/status   { "status": "PREPARING" }
        │
        ▼
order-service (:4003)
  valida que la transición sea legal      → si no, devuelve 422
  persiste el cambio
  publica ORDER_STATUS_CHANGED
        │
        ├──► notification-service  (aviso del cambio de estado)
        └──► el frontend consulta con GET /api/v1/part-requests/:id/check-status
```

El frontend puede consultar `check-status` periódicamente mientras espera,
para mostrar al usuario que el pedido se está procesando.

---

## Estados

### Solicitud (Part Request)

| Estado | Significado |
|---|---|
| `PUBLISHED` | Visible para los proveedores. Acepta ofertas. |
| `ORDERED` | Ya tiene una oferta aceptada y un pedido generado. |
| `COMPLETED` | El pedido se finalizó. |
| `CANCELLED` | El solicitante la canceló antes de aceptar oferta. |

### Oferta (Offer)

| Estado | Significado |
|---|---|
| `SUBMITTED` | Enviada, pendiente de decisión. |
| `ACCEPTED` | La elegida. Genera el pedido. **Solo una por solicitud.** |
| `REJECTED` | No seleccionada. Queda en el historial. |

### Pedido (Order)

| Estado | Quién lo cambia |
|---|---|
| `PENDING` | order-service, al crear el pedido |
| `PREPARING` | Proveedor |
| `SHIPPED` | Proveedor |
| `DELIVERED` | Proveedor |
| `COMPLETED` | Solicitante, confirma la recepción |
| `CANCELLED` | Cualquiera, antes de `SHIPPED` |

---

## Lo que NO es obligatorio

Estas funcionalidades son **complementarias**. Solo se abordan después de que
el flujo de arriba funcione completo:

- Pasarela de pagos real (la confirmación de compra se **simula**).
- Valoraciones de proveedores.
- Notificaciones push en tiempo real.
- Filtros avanzados de búsqueda.

No los empieces hasta tener el flujo principal andando. El proyecto se evalúa
por el flujo, no por la cantidad de características.

---

## Criterio de "ya funciona"

El flujo principal está completo cuando:

- [ ] Un usuario se registra como `COMPRADOR` y publica una solicitud.
- [ ] Un usuario se registra como `PROVEEDOR` y ve esa solicitud.
- [ ] El proveedor envía una oferta y el solicitante la recibe.
- [ ] El solicitante ve **varias** ofertas y puede compararlas.
- [ ] Al aceptar una, las demás pasan a `REJECTED` automáticamente.
- [ ] Intentar aceptar una segunda oferta devuelve `409`.
- [ ] El pedido se crea **solo**, sin que nadie lo pida por endpoint.
- [ ] El proveedor avanza el pedido por sus estados.
- [ ] Un estado inválido devuelve `422`.
- [ ] El solicitante confirma la finalización.
- [ ] Todo pasando por el Gateway, con JWT, y cada servicio con su propia BD.
