# Frontend (Angular)

## Base técnica

- Angular en su versión estable actual, **componentes standalone**.
- **Angular Material** para formularios, tablas, diálogos y la campanita.
- Una sola aplicación con rutas por rol.
- Habla **solo con el Gateway** (`environment.apiUrl = http://localhost:4000/api/v1`).
- Se sirve con **nginx** dentro de Docker (puerto 4200).

## Estructura

```
src/app/
├── core/            interceptor JWT, guards por rol, servicio de sesión, manejo de errores
├── shared/          componentes dumb reutilizables (tarjetas, badges de estado, timeline)
├── features/
│   ├── auth/        login, registro
│   ├── comprador/   solicitudes, comparador, pago, pedidos, vehículos
│   ├── proveedor/   perfil comercial, solicitudes abiertas, ofertas, pedidos
│   ├── admin/       proveedores pendientes, categorías
│   └── notificaciones/  campanita y lista
└── facades/         un servicio por dominio que habla con la API
```

## Patrón smart / dumb

- **Smart (uno por pantalla):** usa una *facade* para pedir o enviar datos y
  reacciona a los eventos de sus hijos.
- **Dumb:** recibe datos por `input()`, avisa con `output()`, usa
  `ChangeDetectionStrategy.OnPush` y no inyecta servicios.
- **Ejemplo de reutilización:** `OfferCardComponent` se usa en el comparador
  del comprador (con botón "Aceptar") y en "Mis ofertas" del proveedor (con
  botón "Retirar").

## Seguridad en el cliente

- El interceptor agrega `Authorization: Bearer <token>` y, si recibe 401,
  cierra la sesión y lleva al login.
- Guards por rol (`COMPRADOR`, `PROVEEDOR`, `ADMIN`) y redirección al panel de
  cada rol después del login.
- El frontend **solo refleja** las reglas: oculta botones que no aplican, pero
  la regla vive en el backend. Si el backend responde 409 o 422, se muestra
  su `msg`.

## Pantallas

### Públicas
| Ruta | Pantalla |
|---|---|
| `/login` | Inicio de sesión |
| `/registro` | Registro, eligiendo comprador o proveedor |

### Comprador
| Ruta | Pantalla |
|---|---|
| `/comprador/solicitudes` | Mis solicitudes con su estado |
| `/comprador/solicitudes/nueva` | Nueva solicitud: elegir categoría (tarjetas con ícono), elegir uno de mis vehículos o escribir los datos, descripción, foto, ciudad y urgencia |
| `/comprador/solicitudes/:id` | Detalle y **comparador de ofertas**, ordenable por precio o días; botón "Aceptar" con confirmación |
| `/comprador/pedidos/:id/pago` | **Pago simulado** (ver abajo) |
| `/comprador/pedidos` | Mis pedidos |
| `/comprador/pedidos/:id` | Seguimiento con línea de tiempo de estados y botón "Confirmar recepción" cuando está `DELIVERED` |
| `/comprador/vehiculos` | Mis vehículos |

Al aceptar una oferta, la app muestra "Generando tu pedido…" y consulta
`GET /orders/by-offer/{offerId}` cada 2 s hasta que exista. Luego lleva a la
pantalla de pago.

### Proveedor
| Ruta | Pantalla |
|---|---|
| `/proveedor/perfil` | Perfil comercial y su estado (pendiente, aprobado o rechazado con motivo) |
| `/proveedor/solicitudes` | Solicitudes abiertas, con filtro por ciudad y categoría. Si el perfil no está aprobado, se muestra un aviso en lugar de la lista |
| `/proveedor/solicitudes/:id/ofertar` | Formulario de oferta |
| `/proveedor/ofertas` | Mis ofertas con su estado |
| `/proveedor/pedidos` | Mis pedidos, con el botón de siguiente estado según entrega o retiro |

### Admin
| Ruta | Pantalla |
|---|---|
| `/admin/proveedores` | Perfiles pendientes: aprobar o rechazar con motivo |
| `/admin/categorias` | Lista, crear, editar y activar o desactivar |

### Común
- **Campanita** en la barra superior: muestra el número de no leídos
  (consulta cada 15 s) y una lista desplegable. Al hacer clic en un aviso,
  navega a su `link` y lo marca como leído.

## Pantalla de pago simulado

- Encabezado: resumen del pedido (repuesto, proveedor y total en BOB) y un
  aviso visible: **"Simulación: no se realiza ningún cobro"**.
- Dos pestañas:
  - **QR:** un código QR generado con un texto de referencia
    (`REPUESTOSYA|PEDIDO-12|620.00|BOB`) y el botón "Ya pagué".
  - **Tarjeta:** formulario con datos de demostración ya cargados
    (`4111 1111 1111 1111`, `12/30`, `123`). Solo se valida el formato en el
    navegador.
- Al confirmar se envía **solo** `{ "method": "QR" }` o
  `{ "method": "CARD" }`. **Los datos de la tarjeta nunca salen del
  navegador.**
- Al responder, se muestra la referencia del pago y se lleva al seguimiento
  del pedido.

## Estados en pantalla

| Valor | Texto |
|---|---|
| `PUBLISHED` | Publicada |
| `RECEIVING_OFFERS` | Recibiendo ofertas |
| `OFFER_ACCEPTED` | Oferta aceptada |
| `COMPLETED` | Completada |
| `CANCELLED` | Cancelada |
| `PENDING_PAYMENT` | Pendiente de pago |
| `PREPARING` | Preparando |
| `IN_TRANSIT` | En camino |
| `READY_FOR_PICKUP` | Listo para retiro |
| `DELIVERED` | Entregado |
