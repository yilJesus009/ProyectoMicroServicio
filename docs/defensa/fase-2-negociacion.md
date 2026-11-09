# Defensa — Fase 2, Negociación completa (bloque A2)

## Qué se hizo

**Entrega 1 — Solicitudes y copia de proveedores:**
- `POST /part-requests` exige y valida `category_id` contra Catálogo (HTTP,
  `fetch` nativo de Node 20, timeout 3 s). 404 de Catálogo → `400`
  (categoría inexistente); categoría `active: false` → `422`; Catálogo
  caído o sin responder → `503` ("Catálogo no disponible"), nunca `500`.
- Rutas finales del contrato: `mine`, `open` (solo proveedor **aprobado**),
  detalle y foto con visibilidad (dueño o proveedor aprobado), `cancel`.
- Copia local de proveedores (`suppliers`), alimentada por
  `SUPPLIER_PROFILE_SUBMITTED` (vuelve a `approved: false`, aunque ya
  estuviera aprobado — se revisa el perfil de nuevo), `SUPPLIER_APPROVED`
  y `SUPPLIER_REJECTED` (se quita de la copia). Cola propia con su `.dlq`;
  un evento sin `event_id` se descarta ahí directo.

**Entrega 2 — Ofertas y aceptar oferta:**
- `POST /part-requests/{id}/offers`: solo proveedor aprobado, `supplier_name`
  sale de la copia local (nunca del body). La primera oferta pasa la
  solicitud de `PUBLISHED` a `RECEIVING_OFFERS`.
- `PATCH /offers/{id}/withdraw`: solo el dueño de la oferta, solo si sigue
  `SUBMITTED` y la solicitud sigue abierta.
- `POST /offers/{id}/accept`: **la operación crítica** (ver abajo).
- `GET /part-requests/{id}/offers` (comparador, dueño, `sort=price|days`)
  y `GET /offers/mine`.

## El patrón que vale explicar: la regla de una sola oferta aceptada

Las tres capas de `AGENTS.md` §4.1, en código real:

1. **La solicitud se bloquea primero** (`SELECT ... FOR UPDATE`), y no solo
   al aceptar: **enviar, retirar y aceptar** bloquean la misma fila antes
   de hacer nada. Así, mientras se está aceptando una oferta, nadie puede
   enviar una nueva ni retirar otra sobre la misma solicitud — las tres
   operaciones se serializan entre sí.
2. **Verificación de dominio con el lock ya tomado.** Dentro de la
   transacción, primero se pregunta "¿esta solicitud ya tiene una oferta
   `ACCEPTED`?" — si la hay, **409** (es la segunda aceptación). Recién
   después vienen los `422` de estado (oferta ya retirada, solicitud
   cancelada). El orden importa: si se invirtiera, la segunda aceptación
   daría `422` en vez del `409` que pide el contrato.
3. **Índice `UNIQUE` parcial** en la base
   (`uq_one_accepted_offer ON offers (part_request_id) WHERE status = 'ACCEPTED'`)
   como red de seguridad: si algo se colara pese al lock, Postgres
   rechaza el `INSERT`/`UPDATE` con `unique_violation`, y el código lo
   traduce a `409`, no a un `500`.

Al aceptar: la oferta ganadora pasa a `ACCEPTED`, todas las demás `SUBMITTED`
de esa solicitud pasan a `REJECTED` en la misma consulta, y la solicitud
pasa a `OFFER_ACCEPTED` — los tres cambios y los tres tipos de evento
(`OFFER_ACCEPTED` con todo lo que necesita Pedidos, un `OFFER_REJECTED`
por cada rechazada, y `PART_REQUEST_STATUS_CHANGED`) se guardan en el
outbox dentro de la **misma transacción** que bloqueó la solicitud.

## Cómo se probó

- **89 pruebas unitarias** (`node --test`), todas pasan: dominio (`Offer`,
  transiciones, `PartRequest.acceptsOffers`), cada comando con un
  repositorio falso transaccional (éxito, los 403/409/422 de cada regla,
  el orden exacto 409-antes-que-422 de la segunda aceptación, y la
  traducción del `unique_violation` simulado), las dos queries, y los
  DTOs de oferta.
- **Verificación real completa en Docker** (9 contenedores healthy, por
  el Gateway): categoría válida/inexistente/inactiva, proveedor no
  aprobado → 403 en `/open` y al ofertar, `SUPPLIER_APPROVED`/
  `SUPPLIER_PROFILE_SUBMITTED` reales vía RabbitMQ, enviar y retirar una
  oferta de punta a punta.
- **`scripts/prueba-concurrencia-aceptar.mjs`** (repetible, contra el
  Gateway y Postgres real, sin mocks): crea un comprador y dos
  proveedores, los aprueba, publica dos ofertas, y lanza los dos
  `POST /offers/{id}/accept` **exactamente a la vez** con `Promise.all`.
  Corrido dos veces seguidas: las dos veces, exactamente un `200`, un
  `409`, y una sola oferta `ACCEPTED` en el comparador.

## Un bug real que se corrigió de paso

El evento `PART_REQUEST_STATUS_CHANGED` de la Fase 1 publicaba
`request_id` en el payload; `docs/eventos.md` pide `part_request_id`. Se
corrigió en `changePartRequestStatus.js` (usado por `/cancel`) y se
replicó el nombre correcto en los dos lugares nuevos que publican el
mismo evento (enviar la primera oferta, aceptar).

## Limitaciones

- La prueba de concurrencia corre como script aparte (necesita la pila
  completa en Docker); no es parte de `npm test`.
- No se probó la carrera "aceptar mientras se retira la misma oferta
  desde otro proceso" con tráfico real concurrente (sí está cubierta por
  el lock de la solicitud a nivel de diseño, y por un test unitario con
  el estado ya mutado).
