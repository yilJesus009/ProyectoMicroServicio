# Inventario del frontend — Fase 0 (reconocimiento)

Este documento es el resultado de la Fase 0 del rediseño visual. Es solo
lectura del código actual: no se modificó ningún archivo del frontend para
producirlo.

## 1. Stack y arquitectura

- **Angular 20.3.0**, **Angular Material 20.2.14**, **Angular CDK 20.2.14**
  (`apps/frontend/package.json`).
- 100% **standalone**: no hay `NgModule` de la aplicación. `main.ts` llama
  `bootstrapApplication(App, appConfig)`. Cada componente declara sus
  `imports` propios (`MatButtonModule`, `ReactiveFormsModule`, etc.).
- **Tema actual**: Material 3 con `mat.theme()` en `src/styles.scss`,
  paleta `mat.$azure-palette` (primario) / `mat.$blue-palette` (terciario),
  tipografía Roboto, densidad 0. Es el tema azul que DISEÑO.md pide
  reemplazar por el rojo de marca.
- **Íconos actuales**: fuente **"Material Icons"** de Google Fonts, enlazada
  en `src/index.html` junto con Roboto. No hay ningún paquete de íconos
  instalado vía npm.
- **Carpeta `public/`**: solo contiene `favicon.ico` (el genérico de Angular
  CLI, no el de marca).
- Arquitectura de pantallas: patrón **smart/dumb** consistente en todo el
  proyecto — cada pantalla de ruta es "smart" (inyecta una o más *facades* de
  `apps/frontend/src/app/facades/`, maneja `signal`s de `cargando/error/aviso`
  y llama a la API), y reutiliza componentes "dumb" de `shared/`
  (`tarjeta-solicitud`, `offer-card`, `order-card`, `order-timeline`,
  `estado-perfil`, `campanita`) que solo reciben `input()` y emiten
  `output()`.
- **Facades** (única puerta entre pantallas y Gateway, todas en
  `apps/frontend/src/app/facades/`): `auth.facade.ts`, `solicitudes.facade.ts`,
  `pedidos.facade.ts`, `suppliers.facade.ts`, `catalogo.facade.ts`,
  `notificaciones.facade.ts`.

## 2. Inventario de pantallas por rol

Todas las pantallas listadas están **implementadas y conectadas a datos
reales** del backend a través de su facade — ninguna usa datos de prueba
"hardcodeados" ni es un componente provisorio. El inventario completo:

### Públicas

| Ruta | Componente | Qué muestra | Acciones | Facade / endpoint |
|---|---|---|---|---|
| `/login` | `LoginComponent` (`features/auth/login`) | Formulario correo + contraseña | `onSubmit()` → login, navega al panel del rol que devuelve el backend | `AuthFacade.login` → `POST /auth/login` |
| `/registro` | `RegistroComponent` (`features/auth/registro`) | Formulario nombre, correo, contraseña, teléfono, ciudad, rol (COMPRADOR/PROVEEDOR) | `onSubmit()` → registro + login automático | `AuthFacade.registroYEntrar` → `POST /auth/register` + `POST /auth/login` |

### Comprador

| Ruta | Componente | Qué muestra | Acciones | Facade / endpoint |
|---|---|---|---|---|
| `/comprador/solicitudes` | `MisSolicitudesComponent` | Lista de solicitudes propias (tarjeta con estado, vehículo, categoría, ciudad, urgencia, fecha) | Enlace a "Nueva solicitud" y al detalle de cada tarjeta | `SolicitudesFacade.mias` → `GET /part-requests/mine` |
| `/comprador/solicitudes/nueva` | `NuevaSolicitudComponent` | Formulario: categoría (tarjetas), vehículo (propio o manual), descripción, ciudad, urgencia, foto opcional | `crear()` → publica la solicitud (multipart) | `CatalogoFacade.categoriasActivas` + `misVehiculos`; `SolicitudesFacade.crear` → `POST /part-requests` |
| `/comprador/solicitudes/:id` | `DetalleSolicitudComponent` | Detalle de la solicitud + **comparador de ofertas** (ordenable por precio/días), foto, aceptar una oferta con confirmación en línea | `cambiarOrden()`, `confirmarAceptacion()` / `aceptar()`, polling de "generando pedido" | `SolicitudesFacade.detalle`, `.ofertas`, `.foto`, `.aceptar`; `PedidosFacade.porOferta` (polling) |
| `/comprador/pedidos` | `MisPedidosComponent` | Lista de pedidos propios (tarjeta `OrderCardComponent`) | Enlace al seguimiento de cada uno | `PedidosFacade.misPedidos` → `GET /orders/mine` |
| `/comprador/pedidos/:id` | `SeguimientoComponent` | **Seguimiento del pedido**: línea de tiempo de estados (`OrderTimelineComponent`), botón "Confirmar recepción" si está `DELIVERED` | `confirmarRecepcion()` | `PedidosFacade.detalle` → `GET /orders/{id}`; `.confirmarRecepcion` → `POST /orders/{id}/confirm-receipt` |
| `/comprador/pedidos/:id/pago` | `PagoComponent` | Pago simulado: QR (generado en el navegador con `qrcode-generator`) o formulario de tarjeta de demostración | `pagar()` — envía solo `{ method }` | `PedidosFacade.detalle`, `.pagar` → `POST /orders/{id}/payment` |
| `/comprador/vehiculos` | `VehiculosComponent` | Lista de vehículos propios, alta y borrado | `crear()`, `borrar()` | `CatalogoFacade.misVehiculos`, `.crearVehiculo` → `POST /vehicles`, `.borrarVehiculo` → `DELETE /vehicles/{id}` |

### Proveedor

| Ruta | Componente | Qué muestra | Acciones | Facade / endpoint |
|---|---|---|---|---|
| `/proveedor/perfil` | `PerfilProveedorComponent` | Formulario de perfil comercial (nombre, ciudad, teléfono, categorías) + badge de estado (`EstadoPerfilComponent`) | `guardar()` — siempre vuelve a `PENDING` | `SuppliersFacade.miPerfil` (404→null), `.guardarPerfil` → `PUT /suppliers/me` |
| `/proveedor/solicitudes` | `SolicitudesAbiertasComponent` | Solicitudes abiertas con filtro de ciudad y categoría; si el perfil no está `APPROVED` muestra el aviso de estado en vez de la lista | `buscar()` con filtros | `SuppliersFacade.miPerfil`; `SolicitudesFacade.abiertas` → `GET /part-requests/open` |
| `/proveedor/solicitudes/:id/ofertar` | `OfertarComponent` | Formulario de oferta (precio, marca, condición, disponibilidad, entrega, días, notas) sobre el detalle de la solicitud | `enviar()` | `SolicitudesFacade.detalle`, `.enviarOferta` → `POST /part-requests/{id}/offers` |
| `/proveedor/ofertas` | `MisOfertasComponent` | Lista de ofertas propias con estado (`OfferCardComponent`) | `retirar()` (solo si `SUBMITTED`) | `SolicitudesFacade.misOfertas` → `GET /offers/mine`; `.retirar` → `PATCH /offers/{id}/withdraw` |
| `/proveedor/pedidos` | `PedidosProveedorComponent` | Lista de pedidos a entregar/preparar, con botón del siguiente estado según `delivery_type` | `avanzar()` | `PedidosFacade.delProveedor` → `GET /orders/supplier`; `.cambiarEstado` → `PATCH /orders/{id}/status` |

### Administrador

| Ruta | Componente | Qué muestra | Acciones | Facade / endpoint |
|---|---|---|---|---|
| `/admin/proveedores` | `AdminProveedoresComponent` | Lista de perfiles de proveedor (filtrable por estado, `PENDING` por defecto), con categorías legibles | `aprobar()`, `abrirRechazo()`/`rechazar()` (motivo obligatorio) | `SuppliersFacade.listar`, `.aprobar` → `POST /admin/suppliers/{id}/approve`, `.rechazar` → `POST /admin/suppliers/{id}/reject` |
| `/admin/categorias` | `AdminCategoriasComponent` | Tabla de categorías (activas e inactivas), alta y edición en línea | `crear()`, `abrirEdicion()`/`guardarEdicion()`, `alternar()` (activar/desactivar, nunca se borran) | `CatalogoFacade.categoriasTodas`, `.crearCategoria` → `POST /admin/categories`, `.editarCategoria` → `PUT /admin/categories/{id}`, `.alternarCategoria` → `PATCH /admin/categories/{id}/toggle` |

### Comunes a los tres roles

- **`LayoutComponent`** (`features/layout`): barra superior (Material
  toolbar) + menú lateral (Material sidenav) según el rol, usando
  `MENU_POR_ROL` de `features/layout/menu.ts`. Hoy el menú **solo tiene
  `etiqueta` y `ruta`** — la interfaz `ItemMenu` no define ningún campo de
  ícono. Ver nota en la sección 5: DISEÑO.md pide un ícono PNG propio por
  cada ítem del menú, así que la Fase 2 va a necesitar agregar un campo
  (p. ej. `icono`) a esa interfaz y a cada entrada — es un cambio de
  estructura de datos presentacional en un `.ts`, no de lógica de negocio,
  pero cae bajo la regla de "si un cambio visual necesita tocar un `.ts`, se
  propone primero".
- **`CampanitaComponent`** (`shared/campanita`): contador de avisos sin leer
  (poll cada 15 s) + panel desplegable con la lista; clic en un aviso navega
  a su `link` y lo marca leído. Totalmente funcional, conectado a
  `NotificacionesFacade` (`GET /notifications/unread-count`,
  `GET /notifications/mine`, `PATCH /notifications/{id}/read`,
  `PATCH /notifications/read-all`). **No existe una pantalla de ruta propia
  para notificaciones** — todo vive en este componente de la barra superior.
  Esto es relevante para la Fase 3: el encargo original menciona
  "notificaciones" como pantalla a tematizar, pero en el código es un
  desplegable, no una ruta.

## 3. Pantallas "vacías" o con componente provisorio

**No existe ningún `PaginaVaciaComponent` ni placeholder literal en el
proyecto.** Se verificó con `grep` sobre todo `src/app`: los únicos
resultados para "placeholder" fueron atributos HTML de inputs (`placeholder="Toyota"`,
etc.), falsos positivos.

En particular, las dos pantallas que el encargo señalaba como posiblemente
vacías **están completamente implementadas y conectadas a datos reales**:

- **`DetalleSolicitudComponent`** (comparador de ofertas, 206 líneas):
  pide el detalle y las ofertas en paralelo (`SolicitudesFacade.detalle` +
  `.ofertas`), permite reordenar por precio o días contra el backend
  (`GET /part-requests/{id}/offers?sort=`), acepta una oferta con un panel de
  confirmación en línea (no `MatDialog`, a propósito — el proyecto no
  depende de `@angular/animations`), actualiza localmente las demás ofertas a
  `REJECTED` tras aceptar, y hace *polling* cada 2 s sobre
  `GET /orders/by-offer/{offerId}` (hasta 15 intentos) para navegar al pago
  en cuanto el pedido nace del evento `OFFER_ACCEPTED`. También carga la foto
  de la solicitud como blob autenticado.
- **`SeguimientoComponent`** (seguimiento del pedido, 69 líneas): pide el
  detalle completo del pedido (`GET /orders/{id}`, con `history` y `payment`)
  y lo pasa a `OrderTimelineComponent` (línea de tiempo real, no simulada);
  muestra "Confirmar recepción" cuando el estado es `DELIVERED`.

Todos los endpoints que estas dos pantallas usan **ya existen** y están
expuestos por el Gateway (`apps/gateway/src/routes/index.js`):
`/part-requests/*` y `/offers/*` → Negociación; `/orders/*` → Pedidos. No
falta ningún endpoint para alimentarlas. **Conclusión: no hay trabajo de
Fase 4 pendiente para estas dos pantallas** — el rediseño visual de ambas
entra en la Fase 3 (pantallas existentes), no en la Fase 4 (pantallas
vacías). Si el plan original asumía que había que crear lógica nueva ahí,
esa suposición no se cumple: solo hace falta rediseño visual (HTML/SCSS),
sin tocar los `.ts`.

No se identificó ninguna otra pantalla de las 15 de la Fase 3 que esté vacía
o sea un stub. Todas cargan datos reales desde su facade correspondiente.

## 4. Valores reales de estado (de los tipos TypeScript de las facades y los enums del backend)

Estos son los valores **exactos** encontrados en el código, no inventados:

| Entidad | Tipo TS (facade) | Valores reales | Etiqueta en español ya en código |
|---|---|---|---|
| Urgencia | `Urgencia` (`solicitudes.facade.ts`) | `BAJA` \| `MEDIA` \| `ALTA` | "Urgencia baja/media/alta" (`tarjeta-solicitud.component.ts`) |
| Solicitud | `EstadoSolicitud` | `PUBLISHED` \| `RECEIVING_OFFERS` \| `OFFER_ACCEPTED` \| `COMPLETED` \| `CANCELLED` | "Publicada" / "Recibiendo ofertas" / "Oferta aceptada" / "Completada" / "Cancelada" |
| Oferta | `EstadoOferta` | `SUBMITTED` \| `ACCEPTED` \| `REJECTED` \| `WITHDRAWN` | "Enviada" / "Aceptada" / "No elegida" / "Retirada" |
| Condición de oferta | `CondicionOferta` | `NEW` \| `USED` \| `REFURBISHED` | "Nuevo" / "Usado" / "Reacondicionado" |
| Disponibilidad | `Disponibilidad` | `IN_STOCK` \| `ON_ORDER` | "En stock" / "Por encargo" |
| Entrega | `TipoEntrega` | `DELIVERY` \| `PICKUP` | "Entrega a domicilio" / "Retiro en tienda" |
| Pedido | `EstadoPedido` (`pedidos.facade.ts`) | `PENDING_PAYMENT` \| `PREPARING` \| `IN_TRANSIT` \| `READY_FOR_PICKUP` \| `DELIVERED` \| `COMPLETED` | "Pendiente de pago" / "Preparando" / "En camino" / "Listo para retiro" / "Entregado" / "Completada" |
| Pago | `MetodoPago` | `QR` \| `CARD` (el pedido además guarda `payment: { method, reference, paid_at } \| null`, es decir "sin pagar" vs "pagado", no hay un estado `PENDING`/`CONFIRMED` explícito en el tipo) | — |
| Proveedor | `EstadoPerfil` (`suppliers.facade.ts`) | `PENDING` \| `APPROVED` \| `REJECTED` | "Pendiente de aprobación" / "Aprobado" / "Rechazado" |

Confirmado además contra el backend de Pedidos
(`apps/pedidos/.../domain/enums/OrderStatus.java`): el enum real es
exactamente `PENDING_PAYMENT, PREPARING, IN_TRANSIT, READY_FOR_PICKUP,
DELIVERED, COMPLETED` — **no existe un estado `CANCELLED` para pedidos**. El
diagrama de transición documentado en el propio enum es:

```
PENDING_PAYMENT ──(pago)──► PREPARING ──┬─DELIVERY──► IN_TRANSIT ────┬──► DELIVERED ──(comprador)──► COMPLETED
                                         └─PICKUP───► READY_FOR_PICKUP ┘
```

### Propuesta de mapeo a los tonos de DISEÑO.md (sección 10, tabla "Estados")

DISEÑO.md ya trae una tabla de mapeo estado→tono; esta es la correspondencia
con los valores reales de arriba, señalando las diferencias encontradas:

| Entidad | Valor real | Tono propuesto (DISEÑO.md) |
|---|---|---|
| Urgencia | `BAJA` / `MEDIA` / `ALTA` | Neutro / Atención / Peligro — **coincide exactamente** con DISEÑO.md, sin diferencias. |
| Solicitud | `PUBLISHED` → `RECEIVING_OFFERS` → `OFFER_ACCEPTED` → `COMPLETED` / `CANCELLED` | Información / Atención / Éxito / Neutro / Neutro. **Diferencia a resolver**: DISEÑO.md nombra 4 estados ("Abierta", "Con ofertas", "Oferta aceptada", "Cerrada") pero el enum real tiene 5 (`COMPLETED` y `CANCELLED` son estados distintos). Además, el código ya tiene sus propias etiquetas en español ("Publicada", "Recibiendo ofertas", "Completada", "Cancelada") que no coinciden textualmente con las de DISEÑO.md ("Abierta", "Con ofertas", "Cerrada"). Cambiar ese texto implica editar el objeto `ETIQUETA_ESTADO` en `tarjeta-solicitud.component.ts` (un `.ts`), así que se propone antes de tocarlo. |
| Oferta | `SUBMITTED` → `ACCEPTED` / `REJECTED` / `WITHDRAWN` | Atención / Éxito / Neutro / **Neutro (propuesto)**. DISEÑO.md solo lista 3 valores ("Pendiente", "Aceptada", "No elegida") pero el enum real tiene 4: falta mapear `WITHDRAWN` ("Retirada", cuando el proveedor retira su propia oferta). Se propone tono Neutro, igual que "No elegida", porque ambos son estados finales e inactivos. También la etiqueta real de `SUBMITTED` ya es "Enviada" en el código, no "Pendiente" como dice DISEÑO.md — mismo tipo de diferencia de texto que en Solicitud. |
| Pedido | `PENDING_PAYMENT` → `PREPARING` → `IN_TRANSIT` / `READY_FOR_PICKUP` → `DELIVERED` → `COMPLETED` | **Punto a resolver antes de la Fase 3/4**: DISEÑO.md agrupa "Confirmado, Preparando, En camino, Listo para retiro" bajo tono Información, pero no existe ningún estado real llamado "Confirmado" — el primer estado real es `PENDING_PAYMENT` ("Pendiente de pago"), que semánticamente es lo opuesto a "confirmado" (significa que el comprador todavía no pagó). El diagrama de seguimiento de DISEÑO.md (sección 9) muestra 4 pasos ("Confirmado, Preparando, Listo para retiro, Entregado") sin "En camino", mientras que la tabla de estados sí lo incluye. Además, DISEÑO.md menciona un estado "Cancelado" (tono Neutro) para pedido que **no existe en el backend** (`OrderStatus` no tiene `CANCELLED`). Antes de construir el componente de pasos de la Fase 3 hace falta decidir: (a) cómo llamar al paso `PENDING_PAYMENT` en la línea de tiempo, (b) si "En camino" entra como paso visible o se funde con "Listo para retiro" según el tipo de entrega (el código ya bifurca por `delivery_type`), y (c) qué hacer con el caso "Cancelado" que no tiene estado real — probablemente simplemente no se dibuja nunca, ya que el backend no lo produce. |
| Pago | — | DISEÑO.md propone "Pendiente"/"Confirmado" (Atención/Éxito), que coincide con el campo real `payment: PagoPedido \| null` (null = pendiente, con datos = confirmado). No hay un enum de estado de pago explícito, pero el dato booleano-implícito ya basta para ese mapeo. |
| Proveedor | `PENDING` / `APPROVED` / `REJECTED` | Atención / Éxito / Neutro — **coincide** con DISEÑO.md (los nombres de estado son los mismos; solo cambia el texto completo de la etiqueta "Pendiente de aprobación" vs "Pendiente", diferencia menor de redacción, no de estado). |

**Resumen de lo que hay que decidir con el usuario antes de avanzar a Fase
3/4** (no se inventó ninguna respuesta):
1. ¿Se actualiza el texto de los `ETIQUETA_ESTADO*` en los componentes dumb
   (`tarjeta-solicitud`, `offer-card`, `order-card`) para acercarlos a los
   nombres de DISEÑO.md, o se deja el texto actual y solo se cambia el tono
   visual?
2. ¿Cómo se llama y de qué tono es el paso `PENDING_PAYMENT` en el
   seguimiento del pedido, dado que DISEÑO.md lo llama "Confirmado" pero el
   estado real significa lo contrario?
3. ¿Se quita el caso "Cancelado" del diseño de seguimiento de pedido (no
   existe en el backend) o se deja documentado como un caso que nunca
   ocurre hoy?
4. ¿Qué tono usar para la oferta `WITHDRAWN` ("Retirada"), que no está en la
   tabla de DISEÑO.md? Se propuso Neutro arriba, pendiente de confirmar.

## 5. Brand y assets

- **`brand/`** (raíz del repo): **sí existe** y contiene exactamente los
  archivos que DISEÑO.md espera en su sección 3: `apple-touch-icon.png`,
  `favicon-512.png`, `favicon.ico`, `isotipo-blanco.png`, `isotipo-blanco.svg`,
  `isotipo-rojo.png`, `isotipo-rojo.svg`, `logo-blanco.png`, `logo-blanco.svg`,
  `logo-rojo.png`, `logo-rojo.svg`. Nada falta de lo que la Fase 1 necesita
  copiar a los assets del frontend.
- **`iconos/`** (raíz del repo): existe, pero con una anidación de carpetas
  distinta a la de DISEÑO.md. En el disco es `iconos/iconos/*.png` (no
  `iconos/*.png` directamente): `agregar-foto.png`, `mis-pedidos.png`,
  `mis-solicitudes.png`, `mis-vehiculos.png`, `notificaciones.png`,
  `nueva-solicitud.png`, `salir.png`. Coincide en nombres de archivo con la
  tabla de la sección 10 de DISEÑO.md, solo cambia la ruta de origen (hay
  que copiar desde `iconos/iconos/` en la Fase 1, no desde `iconos/`).
- **`iconos/categorias/`** (raíz del repo, incluida dentro de la carpeta
  `iconos/`, no como carpeta `categorias/` separada en la raíz):
  `carroceria.png`, `electrico.png`, `frenos.png`, `motor.png`,
  `neumaticos.png`, `suspension.png`. Mismos seis nombres que pide DISEÑO.md.
- En el frontend, `apps/frontend/public/` hoy solo tiene el `favicon.ico`
  genérico de Angular CLI — todavía no se copió nada de `brand/`, `iconos/`
  ni `categorias/`. Esto queda para la Fase 1, tal como está planeado.

## 6. Decisiones confirmadas por el usuario (cierre de Fase 0)

1. **Ícono en el menú lateral**: sí se agrega un campo a `ItemMenu`
   (`features/layout/menu.ts`), con la forma
   `icono: { tipo: 'propio' | 'material'; nombre: string }`, porque DISEÑO.md
   (sección 10) mezcla íconos PNG propios (mis solicitudes, nueva solicitud,
   mis pedidos, mis vehículos) con íconos de Material (perfil comercial,
   solicitudes abiertas, mis ofertas, proveedores pendientes, categorías).
   Cambio puramente de datos de presentación en la Fase 2: no se tocan
   rutas, etiquetas ni la forma en que se arma `MENU_POR_ROL`.
2. **Texto de los estados**: se deja el texto actual
   (`ETIQUETA_ESTADO*` en los componentes dumb) porque ya coincide con los
   enums reales y con la documentación de defensa. Solo se les aplica el
   tono de color según el mapeo de la sección 4. Se verificó con grep que
   ninguna pantalla interpola el valor crudo del enum (`{{ x.estado }}`
   directo) — todas pasan por un mapa de etiquetas, así que no aplica la
   excepción que se había dejado abierta.
3. **Pasos del pedido en el seguimiento**: el paso `PENDING_PAYMENT` se
   renombra a algo como "Pendiente de pago" (tono Atención) en vez de
   "Confirmado"; el paso "Cancelado" de DISEÑO.md no se dibuja nunca porque
   `OrderStatus` no tiene ese valor en el backend.
4. **Tono de la oferta `WITHDRAWN`** ("Retirada"): Neutro, igual que
   "No elegida" — ambos son estados finales e inactivos de la oferta.
