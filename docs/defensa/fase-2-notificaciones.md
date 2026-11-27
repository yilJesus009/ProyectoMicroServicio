# Defensa — Fase 2, Notificaciones de negociación (bloque A3)

## Qué se hizo

- **Cola `notificaciones.all`** pasa de existir vacía (fase 1) a tener los
  **7 bindings** que pide el plan, en 3 exchanges: `identity_events`
  (`SUPPLIER_PROFILE_SUBMITTED`, `SUPPLIER_APPROVED`, `SUPPLIER_REJECTED`),
  `part_request_events` (`PART_REQUEST_CREATED`) y `offer_events`
  (`OFFER_SUBMITTED`, `OFFER_ACCEPTED`, `OFFER_REJECTED`).
- **Copia local de proveedores aprobados** (`suppliers`: `supplier_id`,
  `city`, `category_ids`, `approved`), para enrutar `PART_REQUEST_CREATED`
  sin tener que preguntarle a nadie.
- **Un aviso en español por evento**, con `title`, `message` con datos
  concretos y `link` a la pantalla correspondiente (`docs/frontend.md`):

  | Evento | Destinatario | Ejemplo de mensaje | Link |
  |---|---|---|---|
  | `SUPPLIER_PROFILE_SUBMITTED` | rol `ADMIN` | "Nuevo Proveedor SRL envió su perfil comercial para revisión." | `/admin/proveedores` |
  | `SUPPLIER_APPROVED` | el proveedor | "Tu perfil comercial (Repuestos Notif) fue aprobado." | `/proveedor/perfil` |
  | `SUPPLIER_REJECTED` | el proveedor | "Tu perfil comercial fue rechazado: {reason}" | `/proveedor/perfil` |
  | `PART_REQUEST_CREATED` | proveedores aprobados de esa categoría y ciudad | "Nueva solicitud: Frenos para Toyota Corolla 2018" | `/proveedor/solicitudes/{id}/ofertar` |
  | `OFFER_SUBMITTED` | el comprador | "Nueva oferta de Repuestos Notif: 620 BOB" | `/comprador/solicitudes/{id}` |
  | `OFFER_ACCEPTED` | el proveedor ganador | "Tu oferta de 620 BOB fue aceptada." | `/proveedor/ofertas` |
  | `OFFER_REJECTED` | el proveedor no elegido | "El comprador eligió otra oferta para esta solicitud." | `/proveedor/ofertas` |

- **`PATCH /notifications/:id/read`** (solo el dueño, por `user_id` o por
  su `rol`) y **`PATCH /notifications/read-all`**: faltaban del contrato,
  la fase 1 solo tenía `mine` y `unread-count`.
- `mine` y `unread-count` ya incluían los avisos por rol (`Op.or`, desde la
  fase 1); se les agregó el **límite de 50** y se confirmó el orden
  (del más nuevo al más viejo).

## El patrón que vale explicar: por qué el aviso y `processed_events` van juntos

Crear el aviso y marcar el `event_id` como procesado viajan en la **misma
transacción** (`ApplyNegotiationEvent`, con el mismo `IUnitOfWork` que ya
usa Negociación). El consumidor de RabbitMQ solo hace `ack` **después**
de que esa promesa resuelve — es decir, después del `COMMIT`. Si se
hiciera al revés (marcar procesado y crear el aviso por separado, o hacer
`ack` antes de que la transacción termine), un fallo a mitad de camino
podría dejar el evento marcado como procesado sin que el aviso exista — o
el aviso creado pero sin marcar, duplicándolo en un reintento. Con las dos
cosas atómicas, solo hay dos resultados posibles: las dos pasaron, o
ninguna.

`PART_REQUEST_CREATED` es el caso más claro: si hay tres proveedores
aprobados que coinciden, se crean los **tres** avisos y se marca el
evento, todo en una sola transacción — no puede quedar a medio camino.

## Cómo se probó

- **34 pruebas unitarias** (`node --test`), todas pasan: el armado de cada
  mensaje (función pura, sin repositorios), el comando principal con
  repositorios falsos transaccionales (los 7 eventos, el filtro de
  categoría + ciudad sin distinguir mayúsculas, idempotencia), los dos
  comandos de marcar leído, y el consumidor (evento sin `event_id` → dlq,
  sin tocar la lógica de aplicación).
- **Verificación real completa en Docker**, con eventos **reales** de
  Negociación (misma rama, sin simular nada de la Fase 2 de Negociación) y
  eventos de proveedor publicados a mano en `identity_events` (el PR #30
  de Jesús todavía no está en `develop`):
  1. Se aprobó un proveedor a mano → le llegó "Perfil aprobado".
  2. Un comprador creó una solicitud real con `city: "santa cruz"`
     (minúsculas) → al proveedor (copia local en "Santa Cruz") le llegó
     "Nueva solicitud: Frenos para Toyota Corolla 2018" — confirma que la
     comparación de ciudad no distingue mayúsculas.
  3. El proveedor ofertó → al comprador le llegó "Nueva oferta de
     Repuestos Notif: 620 BOB".
  4. El comprador aceptó → al proveedor le llegó "¡Oferta aceptada!".
  5. `PATCH .../read` marcó el aviso; intentar marcar el aviso de **otro**
     usuario dio `403`; `PATCH read-all` marcó los 2 que quedaban.
  6. Repetir el mismo `event_id` de `SUPPLIER_APPROVED` no duplicó el
     aviso (seguían siendo 3, no 4).
  7. Un evento sin `event_id` apareció en `notificaciones.all.dlq`
     (confirmado contando mensajes antes y después por la API de
     RabbitMQ).
  8. Un `SUPPLIER_PROFILE_SUBMITTED` a mano le llegó al `ADMIN` por rol,
     no por `user_id`; `unread-count` lo contó.

## Limitaciones

- No se probó el caso real de `SUPPLIER_APPROVED`/`REJECTED` disparado
  por Identidad (PR #30 todavía no está en `develop`): se publicó a mano
  con el mismo formato exacto que usará Identidad una vez mergeado.
- `SUPPLIER_PROFILE_SUBMITTED` no toca la copia local de proveedores (solo
  genera el aviso a los admins): el modelo exige `city`/`category_ids`
  no nulos, datos que este evento todavía no trae.
