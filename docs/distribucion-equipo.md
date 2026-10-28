# Distribución del equipo

> Somos **4 integrantes**. Cada uno es dueño de sus servicios: los prueba,
> los documenta y los mantiene. Ningún integrante arregla el código de otro
> sin acordarlo primero.

## Integrantes

| Integrante | GitHub | Servicios |
|---|---|---|
| **Jesús** | `@yilJesus009` | identity-service |
| **Dylan** | `@dylan-alvarez` | part-request-service, catalog-vehicle-service |
| **Alexis** | `@alexphxmton` | offer-service, order-service |
| **Latife** | `@hendykg` | api-gateway, notification-service, frontend |

Los dueños de cada área están declarados en [`.github/CODEOWNERS`](../.github/CODEOWNERS).

---

## Asignación

### Jesús — Identidad y acceso
**Servicio:** `identity-service` (Django, puerto `5000`)

- Registro, login, JWT y roles (`COMPRADOR`, `PROVEEDOR`, `ADMIN`).
- Panel de administración con Django Admin.
- Define el contrato del JWT que el Gateway descompone en headers.
- Produce `USER_CREATED`, `USER_ROLE_CHANGED`.

**Punto crítico:** los demás servicios dependen de su JWT. Conviene entregarlo
lo antes posible y documentarlo en `docs/contratos-api.md`.

---

### Dylan — Solicitudes y catálogo
**Servicios:** `part-request-service` (puerto `4001`) y `catalog-vehicle-service` (puerto `4004`)

- CRUD de solicitudes de repuestos y sus estados.
- Datos de vehículos, categorías y referencias de repuestos.
- Filtros por ciudad, estado y urgencia.
- Produce `PART_REQUEST_CREATED`, `PART_REQUEST_STATUS_CHANGED`.

**Nota:** el `part-request-service` ya tiene código base en el repo
(`apps/part-request-service/`). Hay que reestructurarlo a las 4 capas y
migrarlo de SQLite/MySQL a PostgreSQL.

---

### Alexis — Ofertas y pedidos
**Servicios:** `offer-service` (puerto `4002`) y `order-service` (puerto `4003`)

- Gestión de ofertas y comparación de condiciones.
- **La regla de una sola oferta aceptada por solicitud.** Es lo más delicado
  del proyecto y es responsabilidad de este integrante.
- Ciclo de vida del pedido.
- Produce `OFFER_SUBMITTED`, `OFFER_ACCEPTED`, `OFFER_REJECTED`,
  `ORDER_CREATED`, `ORDER_STATUS_CHANGED`.

**Punto crítico:** este integrante es el que hace que el flujo principal
cierra. Conviene coordinar con Dylan el `request_id` y con
Latife el consumo de eventos.

---

### Latife — Gateway, notificaciones e integración
**Servicios:** `api-gateway` (puerto `4000`), `notification-service` (puerto `4005`) y `frontend` (Angular, puerto `4200`)

- Punto de entrada único, validación JWT y reparto de headers.
- Consumidor de todos los eventos → avisos al usuario.
- Frontend Angular: flujos de solicitante y proveedor.
- Docker Compose e integración general.

**Nota importante:** este integrante **no** es el técnico de soporte de todos.
Si un servicio ajeno falla, se avisa al dueño en lugar de arreglarlo en silencio.
El frontend puede recibir ayuda de cualquiera, pero este integrante es quien
lo coordina.

---

## Coordinación

### Antes de empezar a codificar
Los contratos entre servicios se definen **primero** en
`docs/contratos-api.md`, no se improvisan en el código. Un cambio de contrato
afecta a más de un integrante y se discute en el equipo.

### Dependencias entre integrantes

```
Jesús (Identity/JWT)
        │  define el token
        ▼
Latife (Gateway) ──── rutea ────► todos los demás
        │
        ▼
Dylan (Part Request) ── request_id ──► Alexis (Offer/Order)
                                             │
                                             │ OFFER_ACCEPTED
                                             ▼
                                      Latife (Notification)
```

**Secuencia sugerida:**
1. Identity (Jesús) + Gateway (Latife) primero: los demás los necesitan para
   autenticar.
2. Part Request (Dylan) en paralelo con Offer (Alexis).
3. Order (Alexis) cuando Offer ya publique `OFFER_ACCEPTED`.
4. Notification y frontend (Latife) en paralelo con todo lo anterior.

### Ramas

Cada rama nace de `develop` y vuelve a `develop` mediante Pull Request.

| Integrante | Ramas |
|---|---|
| Jesús | `feature/identity-auth`, `feature/identity-roles` |
| Dylan | `feature/part-request-crud`, `feature/catalog-vehicles` |
| Alexis | `feature/offer-management`, `feature/order-lifecycle` |
| Latife | `feature/api-gateway`, `feature/notification`, `feature/frontend-angular` |

## Reglas del equipo

1. **Nadie hace `push` a `main` ni a `develop`.** Todo pasa por PR.
2. **Un PR por funcionalidad**, no "media semana de trabajo en un commit".
3. **Revisión obligatoria**: al menos un integrante distinto del autor.
4. **CI verde antes de mergear**: lint y pruebas deben pasar.
5. **Documentar lo que se acuerda.** Si algo se decide en una charla, queda
   escrito en `docs/`.
6. **Nadie rompe `develop`.** Si tu PR rompe la integración, lo arreglas tú.
