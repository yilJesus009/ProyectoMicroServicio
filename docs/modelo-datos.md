# Modelo de datos

Un PostgreSQL (`repuestosya`), un esquema por servicio. **Ninguna tabla
referencia a otra de un esquema distinto:** los ids ajenos (`buyer_id`,
`category_id`, `offer_id`) se guardan como números sin llave foránea.

---

## Esquema `identidad` (Django)

**`users`** (ya implementado por Jesús; se mantiene)
`id`, `nombre`, `email` (único), `password` (hash), `telefono`, `ciudad`,
`rol` (`COMPRADOR` | `PROVEEDOR` | `ADMIN`), `is_active`, `created_at`.

**`supplier_profiles`**
| Columna | Tipo | Nota |
|---|---|---|
| `id` | bigint PK | |
| `user_id` | FK → `users.id`, único | Un perfil por proveedor |
| `business_name` | varchar | Nombre comercial |
| `city` | varchar | |
| `phone` | varchar | |
| `category_ids` | int[] | Ids de Catálogo que atiende |
| `status` | `PENDING` \| `APPROVED` \| `REJECTED` | |
| `rejection_reason` | text, nulo | |
| `reviewed_by`, `reviewed_at` | nulo | Admin que decidió |
| `created_at`, `updated_at` | | |

---

## Esquema `negociacion` (Express)

**`part_requests`**
| Columna | Tipo | Nota |
|---|---|---|
| `id` | serial PK | |
| `buyer_id` | int | Del JWT |
| `category_id`, `category_name` | int, varchar | Copia validada contra Catálogo |
| `vehicle_brand`, `vehicle_model`, `vehicle_year` | | Copia de los datos del vehículo |
| `description` | text | |
| `city` | varchar | |
| `urgency` | `BAJA` \| `MEDIA` \| `ALTA` | |
| `photo_path` | varchar, nulo | Archivo en el volumen `uploads` |
| `status` | `PUBLISHED` \| `RECEIVING_OFFERS` \| `OFFER_ACCEPTED` \| `COMPLETED` \| `CANCELLED` | |
| `created_at`, `updated_at` | | |

**`offers`**
| Columna | Tipo | Nota |
|---|---|---|
| `id` | serial PK | |
| `part_request_id` | FK → `part_requests.id` | |
| `supplier_id`, `supplier_name` | int, varchar | Nombre tomado de la copia de proveedores |
| `price` | numeric(10,2) | > 0 |
| `currency` | varchar | `BOB` |
| `brand` | varchar | Marca del repuesto |
| `condition` | `NEW` \| `USED` \| `REFURBISHED` | |
| `availability` | `IN_STOCK` \| `ON_ORDER` | |
| `delivery_type` | `PICKUP` \| `DELIVERY` | Retiro o entrega |
| `estimated_days` | int | |
| `notes` | text, nulo | |
| `status` | `SUBMITTED` \| `ACCEPTED` \| `REJECTED` \| `WITHDRAWN` | |
| `created_at`, `updated_at` | | |

Índices clave:
```sql
-- La regla principal: una sola oferta aceptada por solicitud
CREATE UNIQUE INDEX uq_one_accepted_offer ON negociacion.offers (part_request_id)
  WHERE status = 'ACCEPTED';
-- Una oferta activa por proveedor y solicitud
CREATE UNIQUE INDEX uq_one_active_offer_per_supplier ON negociacion.offers (part_request_id, supplier_id)
  WHERE status = 'SUBMITTED';
```

**`suppliers`** (copia local, alimentada por eventos de Identidad)
`supplier_id` PK, `business_name`, `city`, `category_ids` int[], `approved`
boolean, `updated_at`.

**`outbox_events`**, **`processed_events`**: ver final del documento.

---

## Esquema `pedidos` (Spring Boot)

**`orders`**
| Columna | Tipo | Nota |
|---|---|---|
| `id` | bigserial PK | |
| `offer_id` | bigint, **único** | Un pedido por oferta aceptada |
| `part_request_id` | bigint | |
| `buyer_id`, `supplier_id` | bigint | |
| `supplier_name` | varchar | Copia del evento |
| `part_description`, `vehicle_label` | varchar | Copia para mostrar |
| `price`, `currency` | numeric(10,2), varchar | |
| `delivery_type` | `PICKUP` \| `DELIVERY` | |
| `estimated_days` | int | |
| `status` | `PENDING_PAYMENT` \| `PREPARING` \| `IN_TRANSIT` \| `READY_FOR_PICKUP` \| `DELIVERED` \| `COMPLETED` | |
| `created_at`, `updated_at` | | |

**`order_status_history`**: `id`, `order_id` FK, `from_status`, `to_status`,
`changed_by` (user id), `changed_at`.

**`payments`**: `id`, `order_id` FK único, `method` (`QR` | `CARD`),
`reference` (generada, por ejemplo `PAY-20261110-000123`), `amount`,
`paid_at`. **Nunca** datos de tarjeta.

**`outbox_events`**, **`processed_events`**.

---

## Esquema `catalogo` (NestJS)

**`categories`**: `id`, `name` (único), `description`, `icon`, `active`
(boolean), `created_at`.

Precargadas al iniciar si la tabla está vacía: Frenos, Batería, Filtros,
Llantas y ruedas, Suspensión, Motor, Sistema eléctrico, Iluminación,
Carrocería, Transmisión.

**`vehicles`**: `id`, `owner_id` (user id), `brand`, `model`, `year`,
`plate` (nulo), `created_at`.

---

## Esquema `notificaciones` (Express)

**`notifications`**
| Columna | Tipo | Nota |
|---|---|---|
| `id` | serial PK | |
| `user_id` | int, nulo | Destinatario puntual |
| `role` | varchar, nulo | Destinatario por rol (ej. todos los `ADMIN`) |
| `type` | varchar | El evento que la originó |
| `title`, `message` | varchar, text | En español |
| `link` | varchar, nulo | Ruta del frontend, ej. `/comprador/solicitudes/34` |
| `read_at` | timestamp, nulo | |
| `created_at` | | |

**`suppliers`** (copia local): `supplier_id`, `city`, `category_ids`,
`approved`.

**`processed_events`**.

---

## Tablas comunes de mensajería

**`outbox_events`** (Negociación y Pedidos)
`id` uuid PK (= `event_id`), `exchange`, `routing_key`, `payload` jsonb
(sobre completo), `created_at`, `published_at` (nulo hasta publicarse),
`attempts`.

**`processed_events`** (todo servicio que consume)
`event_id` uuid PK, `event_name`, `processed_at`.
