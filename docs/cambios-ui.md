# Cambios del rediseño de UI — RepuestosYa

Registro vivo de lo que cambia en cada fase del rediseño (ver DISEÑO.md en la
raíz del repo y `docs/ui-inventario.md` para el reconocimiento de Fase 0). Se
va completando fase por fase, no solo al final.

## Cómo se tematizó Angular Material

El tema se arma en `apps/frontend/src/styles.scss` con `mat.theme()`:
`primary`/`tertiary: mat.$red-palette` (el tono rojo más cercano que trae
Material) y `typography: Rubik`. Como el rojo que genera Material no es
exactamente `#EA044E`, se sobrescriben a mano las variables del sistema
(`--mat-sys-primary`, `--mat-sys-surface`, `--mat-sys-outline`,
`--mat-sys-error`, etc.) con los tokens de DISEÑO.md — tal como pide la
sección 7 del documento ("si el tono no coincide, sobrescribir").

Dos casos no se resuelven con `--mat-sys-*` porque el propio componente trae
su variable específica, que gana por encima del token general:

- **Botones**: por defecto caen en forma de pastilla (`corner-full`), pero
  DISEÑO.md pide 8px. Se fija aparte con
  `--mat-button-<variante>-container-shape/height`.
- **`mat-toolbar`**: su fondo por defecto es `--mat-sys-surface` (blanco), no
  transparente como en versiones viejas de Material. Se fija con
  `--mat-toolbar-container-background-color/text-color/standard-height`.
- **`mat-sidenav`**: hereda `corner-large` (paneles, 12px), lo que redondea
  el lateral. Se fija con `--mat-sidenav-container-shape: 0px`.

Estos tres se encontraron probando la Fase 2 en el navegador: compilaban sin
error, pero se veían mal porque el CSS propio del componente se inyecta en
tiempo de ejecución y gana el empate de especificidad contra una clase global
del mismo peso.

## Dónde están los tokens y las clases globales

- `apps/frontend/src/styles/_tokens.scss`: el bloque de la sección 14 de
  DISEÑO.md, copiado tal cual.
- `apps/frontend/src/styles/_base.scss`: reset, utilidades de texto
  (`.texto-*`), foco visible (`:focus-visible` con `--anillo-foco`), y la
  clase `.material-icons-round` (el paquete `@fontsource` solo trae la
  fuente, no la clase de uso).
- `apps/frontend/src/styles/_globales.scss`: las clases previstas en la
  sección 14 — `.barra-superior`, `.barra-lateral`, `.item-menu` (+
  `--activo`), `.encabezado-pagina`, `.panel`, `.estado` (+ 5 variantes),
  `.chip-categoria`, `.tabla-comparacion`, `.pasos`, `.vacio`, `.aviso`, y
  `.icono` con un modificador por cada ícono propio (`.icono--mis-pedidos`,
  `.icono--categoria-frenos`, etc.), generados con un `@each` sobre la lista
  de archivos de `iconos/` y `categorias/`.

Nota de rutas: DISEÑO.md da los ejemplos de ícono como `/assets/iconos/...`,
pero este proyecto sirve `public/` directo en la raíz (no bajo `/assets/`),
así que las clases usan `/iconos/...`, `/categorias/...` y `/brand/...`.

## Fase 1 — Fundaciones

- Tema de Material: azul → rojo de marca (ver arriba).
- Tipografía: Roboto → Rubik, autoalojada con `@fontsource/rubik` (pesos
  400/500/600/700/800 + 800 itálica).
- `brand/`, `iconos/` y `categorias/` de la raíz copiados a
  `apps/frontend/public/`; favicon reemplazado por el de marca.

## Fase 2 — Estructura

- **Barra superior**: roja, 56px fijos, logo blanco (`brand/logo-blanco.svg`,
  `alt="RepuestosYa"`), campanita, `nombre, rol` (con coma — DISEÑO.md
  sección 13 prohíbe el punto medio como separador) y "Salir" con borde
  blanco.
- **Barra lateral**: blanca, 240px, recta (ver nota de `mat-sidenav`
  arriba), ítems con ícono propio o de Material según `menu.ts`.
- **Menú por rol** (`features/layout/menu.ts`): se agregó el campo
  `icono: { tipo: 'propio' | 'material'; nombre: string }` a `ItemMenu` —
  cambio de datos de presentación aprobado antes de hacerlo, sin tocar rutas
  ni la forma de armar `MENU_POR_ROL`.
- **Responsivo del menú**: `layout.component.ts` usa `BreakpointObserver` de
  Angular CDK (`(min-width: 1024px)`) para decidir el modo del
  `mat-sidenav`: `side` (fijo) en escritorio, `over` (overlay con fondo
  oscuro, botón hamburguesa) en móvil/tablet. Aprobado antes de agregarlo
  por tocar un `.ts`.
- **Íconos de Material redondeados**: `@fontsource/material-icons-round`
  autoalojado (sin depender de Google Fonts en la demo) + provider
  `MAT_ICON_DEFAULT_OPTIONS` en `app.config.ts`. Aprobado antes.
- **Campanita**: ícono propio (`icono--notificaciones`) en vez del ícono de
  Material; pastilla del contador blanca con número rojo (al revés de como
  estaba); lista de avisos con punto rojo en los no leídos.

### Pruebas ajustadas en Fase 2

El markup de la Fase 2 cambió de forma visible (se dejó `mat-nav-list` por
una lista semántica propia, los botones de texto "Ocultar/Mostrar menú" por
un ícono de hamburguesa condicional, el título de texto por el logo). Dos
`.spec.ts` quedaron con selectores apuntando al markup viejo; se ajustaron
sin tocar ninguna aserción de negocio:

- **`layout.component.spec.ts`**:
  - `etiquetasDelMenu()` pasó de buscar `mat-nav-list a` a
    `.item-menu .item-menu__etiqueta` (la etiqueta ahora vive en su propio
    `<span>` para no mezclarse con el texto del ícono de Material, que
    también es texto real en el DOM por ser una fuente de ligaduras).
  - La prueba "muestra quién es en la barra superior" verificaba
    `textContent` conteniendo el texto `'RepuestosYa'`; ahora revisa que el
    `alt` de `.logo-barra` sea `'RepuestosYa'`, porque el título pasó de
    texto a logo.
  - La prueba del botón de alternar buscaba `'Ocultar menú'`/`'Mostrar
    menú'` por texto; ese botón ahora es un ícono que además solo existe en
    ancho móvil. Se reemplazó por una prueba que llama a `alternar()`
    directamente y comprueba que la señal `abierto` cambia — mismo
    comportamiento, sin depender de un botón que puede no estar en el DOM
    según el ancho de pantalla.
- **`campanita.component.spec.ts`**: el selector `.aviso` pasó a
  `.aviso-item` (la clase se renombró al reestructurar el ítem con punto de
  no-leído, cuerpo y fecha separados).

## Fase 3 — Pantallas existentes

### Login y registro

- Layout de dos paneles de la sección 9 de DISEÑO.md, compartido entre ambas
  pantallas vía el parcial `features/auth/_acceso.scss` (@use): panel rojo
  con logo blanco, titular en itálica gruesa ("Pide tu repuesto, recibe
  ofertas.") y los 3 pasos numerados; panel blanco con el formulario. En
  móvil (≤768px, elegido porque DISEÑO.md no fija un quiebre exacto para
  esta pantalla) el panel rojo se reduce a una franja con el logo y el
  formulario queda debajo, sin los pasos.
- Se quitó `MatCardModule` de ambas pantallas (ya no se usa `mat-card`,
  reemplazado por el layout de dos paneles) y se agregó `MatIconModule` para
  el ícono de error.
- Botón de login: "Entrar" → "Iniciar sesión" (mismo verbo que el título de
  la pantalla, sección 11: "una acción conserva el mismo nombre en botón,
  título y aviso").
- Mensaje de error del servidor: ahora con ícono (`error`) y fondo rojo
  tenue, en vez de solo texto en rojo — sección 4: "un error siempre lleva
  ícono y texto, no solo color".
- Enlaces "Crear cuenta" / "Iniciar sesión": clase `.enlace` nueva en
  `_base.scss` (rojo oscuro, no el rojo de marca, por contraste AA sobre
  fondo claro — sección 4).
- Ningún `.spec.ts` de login/registro necesitó cambios: los selectores usan
  `[formControlName]`, `input[type="radio"]` y textos que no cambiaron.

### Clase global nueva: `.mensaje-servidor`

El mensaje de error del servidor (ícono + fondo tenue del tono) se repetía
en cada pantalla. Se promovió a `_globales.scss` con variantes de tono
(`--exito`, `--atencion`, `--info`, `--neutro`, `--peligro`; sin modificador
= peligro, para no tocar los sitios que ya la usaban así). No confundir con
`.aviso`: esa es para el `panelClass` de `MatSnackBar` (flotante, con
sombra); `.mensaje-servidor` es parte fija del flujo de la página.

### Mis solicitudes

- `.encabezado-pagina` y el bloque `.vacio` con el texto exacto del ejemplo
  de DISEÑO.md sección 10 ("Aún no tienes solicitudes…" / "Publicar
  solicitud"), antes de la Fase 5 porque ya estaba rehaciendo este bloque.
- Se quitó `MatCardModule` (ya no se usa `mat-card`).

### Tarjeta de solicitud (`shared/tarjeta-solicitud`, dumb, la usan "Mis
solicitudes" y "Solicitudes abiertas")

- Estado y urgencia pasan a `.estado`/`.estado--<tono>` con el mapeo de la
  sección 4: Solicitud → info/atención/éxito/neutro/neutro;
  Urgencia → neutro/atención/peligro. El **texto** de las etiquetas no
  cambió (decisión ya tomada en el cierre de Fase 0).
- Categoría: ícono propio + nombre (sección 9: "categoría (ícono + nombre)").
  Se agregó un `computed()` (`iconoCategoria`) que normaliza el
  `category_name` (sin tildes, minúsculas) y lo compara contra las 6
  categorías con PNG; si no hay PNG (categoría creada por el admin sin uno)
  cae al ícono `build` de Material, tal como pide la sección 10. Dato
  puramente de presentación: no se tocó ningún endpoint ni el modelo
  `Solicitud`.

### Detalle de solicitud y comparador de ofertas

- Pasa de tarjetas apiladas (`app-offer-card`) a una tabla
  `.tabla-comparacion` (Proveedor, Precio, Entrega, Nota, Acción/Estado),
  como pide el mockup de la sección 9. `OfferCardComponent` se queda solo
  para "Mis ofertas" del proveedor.
- **Lógica nueva agregada** (aprobada antes de tocar el `.ts`): `computed()`
  `mejorPrecio()` en `detalle-solicitud.component.ts` — devuelve el conjunto
  de ids de las ofertas `SUBMITTED` con el precio más bajo (comparando con
  `Number()` por si llega como texto), marcando todas las empatadas; queda
  vacío si la solicitud ya tiene una oferta aceptada o no hay ofertas
  `SUBMITTED`. Sin llamadas nuevas al backend: usa los datos ya cargados.
  6 pruebas nuevas en `detalle-solicitud.component.spec.ts` (caso normal,
  empate, precio como texto, vacío, ofertas no `SUBMITTED` ignoradas,
  solicitud con oferta ya aceptada).
- Fila aceptada: fondo `#F1FAF4` (hex propio de la sección 9, distinto del
  token general `--color-exito-tenue`). Filas no elegidas/retiradas: texto
  en tinta suave.
- La columna "Acción" muestra el estado de la oferta (`.estado--<tono>`,
  mismo mapeo que `offer-card`) y, si corresponde, el botón "Aceptar
  oferta" con borde rojo (`mat-stroked-button color="primary"`) — ambos a
  la vez, igual que antes mostraba la tarjeta (el `.spec.ts` ya probaba
  que "Enviada" y el botón convivieran).
- Responsive: la tabla usa el `.tabla-comparacion` de Fase 1, que ya se
  apila en bloques `etiqueta: valor` por debajo de 720px (atributos
  `data-etiqueta` agregados a cada `<td>`); no se verificó a mano en
  360px porque no se pudo redimensionar la ventana del navegador en este
  entorno — queda para la verificación final de Fase 6.
- `detalle-solicitud.component.spec.ts`: el único ajuste de selector fue
  cambiar `app-offer-card` por `tbody tr` en la prueba de la oferta
  `WITHDRAWN` (misma aserción: 2 filas).

### Nueva solicitud

- Titular "¿Qué repuesto necesitas?" en itálica gruesa (`.texto-display`,
  sin fondo rojo: ese tratamiento es solo del panel de login/registro).
- Categorías: `.chips-categoria`/`.chip-categoria` de Fase 1 en vez de las
  tarjetas propias que había. Se creó `shared/iconos-categoria.ts`
  (función pura `iconoCategoriaPorNombre`) para no duplicar la lógica de
  ícono por nombre que ya tenía `tarjeta-solicitud`; ambos componentes la
  importan ahora. El campo `icon` (texto libre que carga el admin, p. ej.
  "brake") **ya no se muestra**: se reemplaza por el ícono visual
  (propio o `build` de Material), porque DISEÑO.md prohíbe texto/emoji
  como ícono (sección 13). El campo sigue existiendo en el formulario de
  administración de categorías, solo cambió cómo se usa para mostrar.
- **Lógica nueva agregada** (mismo criterio ya aprobado para
  `mejorPrecio`): vista previa de la foto elegida. `alElegirFoto()` ahora
  también crea/libera un object URL (`fotoPreviewUrl`), con limpieza en
  `ngOnDestroy` — mismo patrón que ya usa `detalle-solicitud` para la foto
  de la solicitud. Sin esto no había forma de cumplir "foto opcional con
  vista previa" (sección 9).
- `nueva-solicitud.component.spec.ts`: la prueba que revisaba el ícono
  comprobaba el texto crudo `'brake'`; ahora comprueba la clase del ícono
  real (`.icono--categoria-frenos`), porque ese texto ya no se muestra.
- Verificado visualmente inyectando categorías de prueba en el signal del
  componente (sin backend): chips con ícono propio, `build` de Material
  para una categoría sin PNG, y el estado seleccionado (rojo tenue +
  borde rojo) al hacer clic.

### Solicitudes abiertas (proveedor) y Ofertar

- `estado-perfil` (compartido con "Perfil comercial" y admin): pasa de
  `mat-chip` con colores propios a `.estado`/`.estado--<tono>`, igual que
  el resto de la app (Proveedor: Pendiente→atención, Aprobado→éxito,
  Rechazado→neutro).
- "Solicitudes abiertas": panel de "perfil no aprobado" con `.panel`, el
  botón de cada fila se renombra de "Ofertar" a "Enviar oferta" (texto
  exacto de la sección 9 y del ejemplo de verbo+objeto de la sección 10).
  Vacío con `.panel.vacio`.
- "Ofertar": resumen de la solicitud en `.panel`, enlace "volver" con
  ícono, mensajes de error con `.mensaje-servidor`. Sin cambios de `.ts`.
- Se quitó `MatCardModule` de ambas pantallas.
- Verificado visualmente con datos inyectados en los signals (sin
  backend): tonos de estado y urgencia correctos, ícono de categoría,
  botones con borde rojo.

### Mis ofertas (proveedor) y sus pedidos

- **Gap frente al mockup**: DISEÑO.md pide columnas "repuesto, comprador o
  ciudad" para la tabla de "Mis ofertas", pero el modelo `Oferta` que
  devuelve `GET /offers/mine` no trae esos datos (solo `part_request_id`,
  sin descripción ni comprador ni ciudad) — no hay JOIN en el contrato. No
  se inventó el dato ni se agregó una llamada por fila al detalle de cada
  solicitud (N+1, y no hay endpoint que lo resuelva mejor ni certeza de que
  el proveedor pueda leer esa solicitud ajena). Se usan las columnas que sí
  existen: Proveedor, Marca, Precio, Fecha, Estado/Acción. Si se quiere
  cerrar esta brecha, hace falta agregar esos campos al contrato del
  backend de Negociación — fuera del alcance del frontend.
- "Mis ofertas" pasa de tarjetas (`OfferCardComponent`) a tabla
  `.tabla-comparacion`, igual que el comparador. `OfferCardComponent` ya no
  se usa en ningún lado (solo quedaba acá y en el comparador).
- `order-card` (compartido con "Mis pedidos" del comprador, que llega en el
  siguiente bloque) pasa a `.estado`/`.estado--<tono>`: los 4 estados en
  tránsito → información, Entregado/Completada → éxito.

### Perfil comercial, Mis pedidos (comprador), Seguimiento y Pago

- "Perfil comercial" y "Mis pedidos" (comprador): mismo tratamiento que las
  pantallas anteriores (`.encabezado-pagina`, `.panel`, `.vacio`,
  `.mensaje-servidor`). Se renombró la clase local `.enlace` de
  "Mis pedidos" a `.tarjeta-enlace` porque colisionaba de nombre con la
  clase global `.enlace` (enlace de texto) agregada en el bloque de
  login/registro — mismo comportamiento, solo el nombre cambia.
- **Lógica nueva agregada** (aprobada antes, con los 6 detalles que pidió
  el usuario): `order-timeline` pasa de listar el historial crudo del
  pedido (log vertical) al stepper horizontal fijo de 4 pasos de la
  sección 9 (Pendiente de pago → Preparando → En camino/Listo para retiro
  según `deliveryType` → Entregado). Cambia su input: en vez de
  `historial: EntradaHistorial[]` recibe `status`, `deliveryType` y
  `history` (los tres ya estaban cargados en `pedido`, sin llamadas
  nuevas). Un paso se marca completado si su estado aparece en el
  historial (con la fecha de ese cambio), actual si coincide con
  `pedido.status`, y futuro si no se alcanzó. Si el estado real no es
  ninguno de los 4 pasos (hoy, solo `COMPLETED`, que ocurre después de
  "Entregado"), el stepper no se rompe: los 4 pasos quedan completados y
  el estado real se muestra aparte como `Estado actual: <etiqueta>` en
  tono neutro. En ≤720px el stepper pasa a vertical (CSS ya construido en
  Fase 1, sin cambios). Se reescribió `order-timeline.component.spec.ts`
  cubriendo los dos `deliveryType`, cada estado como "actual", las fechas
  tomadas de `history`, y el caso `COMPLETED` fuera de los 4 pasos.
- "Seguimiento": usa el nuevo stepper, bloque de pago con la nota exacta
  "Pago simulado. No se guardan datos de tarjeta." (sección 9), estado del
  pedido con `.estado--<tono>`. Se quitó el encabezado "Línea de tiempo"
  (ya no aplica: no es un log, es el stepper fijo) — se ajustó esa
  aserción en el `.spec.ts`, el resto de las pruebas no cambió.
- "Pago": mismo tratamiento visual (pestañas QR/Tarjeta con token de color
  en vez de azul, badge de "Simulación" con `.estado--atencion`). Ningún
  cambio a la lógica del QR ni a la regla de "solo se envía `{ method }`".
- Se promovió `.dos-columnas` (usada en "Nueva solicitud" y ahora en
  "Pago") a clase global en `_globales.scss`, con su propio colapso a una
  columna en móvil.

### Mis vehículos, Proveedores pendientes y Categorías (cierre de Fase 3)

- "Mis vehículos": formulario en `.dos-columnas`, cada vehículo con el
  ícono propio `icono--mis-vehiculos` (sección 10: "junto al vehículo en
  listas y detalles").
- "Proveedores pendientes": tarjetas en vez de filas de tabla literal (el
  mockup de la sección 9 no trae un dibujo ASCII para esta pantalla, a
  diferencia del comparador); se corrigió el separador de ciudad/teléfono
  de "·" a coma. No se agregó la acción "Ver perfil" que menciona la
  sección 9: no existe una pantalla de detalle de perfil aparte, toda la
  información (estado, categorías, motivo de rechazo) ya está en la
  tarjeta — agregarla sería crear una ruta/pantalla nueva sin un
  endpoint adicional que la justifique.
- "Categorías": pasa de tarjetas a tabla `.tabla-comparacion` (Nombre,
  Ícono, Estado, Acciones), como pide la sección 9. La columna "Ícono" usa
  el mismo `iconoCategoriaPorNombre` (ícono propio o `build` de Material)
  en vez del texto crudo del campo `icon`, igual que en "Nueva solicitud".
  La edición en línea se mantiene (ahora como una fila con `colspan`).
- Con esto quedan las 16 pantallas de la Fase 3 — incluida la de
  notificaciones, que no tiene ruta propia: vive en la campanita de la
  barra superior, ya retematizada en la Fase 2.

## Fase 5 — Estados

Decisión tomada con el usuario: los avisos de éxito/error siguen como
bloques fijos `.mensaje-servidor` en la página (no se migró a
`MatSnackBar`, que sí pide la sección 7). Un aviso de error fijo no
desaparece solo — es mejor para no perder el mensaje — y migrar a
`MatSnackBar` real habría cambiado cómo se entrega el aviso en ~12
pantallas (lógica, no solo estilo). **Queda como mejora para después de
la v1.0.**

- **Carga**: se agregó `<mat-progress-bar mode="indeterminate" />` junto
  al texto "Cargando…" en las 14 pantallas con un estado de carga inicial
  (todas las de Fase 3 excepto login/registro, que no tienen carga
  inicial — solo el botón "Entrando…"/"Creando cuenta…" deshabilitado
  durante el envío, que ya existía). Antes solo había texto; ahora cumple
  la sección 10 completa ("barra de progreso de Material en el área que
  carga").
- **Vacíos**: revisados los 9 bloques `.vacio` de la app. Todos ya tienen
  una frase clara de qué va ahí; solo "Mis solicitudes" necesitaba (y ya
  tenía) una acción de creación directa — el resto de pantallas vacías
  (mis ofertas, mis pedidos, proveedores filtrados, categorías, etc.) no
  tiene una acción de creación de una sola pantalla a la que enlazar, así
  que no se forzó ninguna.
- **Errores de formulario**: el texto de los 26 `<mat-error>` de la app ya
  seguía el patrón de la sección 10 (dicen qué corregir o el formato
  esperado). Lo que faltaba — y se agregó en esta fase — es el ícono: la
  sección 4 exige "ícono y texto, no solo color" para todo error, y los
  `mat-error` solo tenían texto. Se agregó `<mat-icon aria-hidden="true">
  error</mat-icon>` dentro de los 26, más la regla `mat-error { display:
  flex; ... }` en `_globales.scss` para alinear ícono y texto. Cambio
  puramente de plantilla, sin tocar ningún `.ts`.
- **Avisos — rol y tono**: revisados los 28 usos de `.mensaje-servidor`:
  ya tenían `role="alert"` en los de error y `role="status"` en los de
  éxito/información, con ícono y tono correctos desde que se fueron
  creando en la Fase 3.
- **Texto "mismo verbo"**: revisados todos los `aviso.set(...)` de la
  app. Solo uno no coincidía con el verbo de su acción: en
  `pedidos-proveedor.component.ts`, el aviso tras avanzar un pedido decía
  `"Pedido #12: marcar en camino — listo."` (con guion largo, raro de
  leer); ahora usa la etiqueta real del nuevo estado:
  `"Pedido #12: ahora está en camino."` (cambio de texto en el `.ts`,
  sin tocar lógica, autorizado explícitamente para este caso). El resto
  de los avisos (oferta aceptada/retirada, perfil guardado, vehículo
  registrado/eliminado, proveedor aprobado/rechazado, categoría
  creada/actualizada/activada/desactivada) ya usaban el mismo verbo que
  su botón.
- **Diálogos de confirmación**: ya existían desde la Fase 3 (aceptar
  oferta con panel en línea, rechazar proveedor con motivo obligatorio).
  No se agregó confirmación a "Eliminar vehículo": DISEÑO.md solo exige
  confirmación explícita para "Rechazar" (sección 9); agregarla a
  "Eliminar" sería una decisión de alcance nueva, no pedida.

### Nota sobre el sub-agente de la Fase 5

Las 13 pantallas restantes con `mat-progress-bar` se delegaron a un
sub-agente (encargo acotado: solo esa barra, en esos 13 archivos). El
sub-agente cumplió su encargo correctamente (build limpio, 209/209), pero
además empezó —sin que se le pidiera— a agregar los íconos de
`mat-error` en varios formularios, dejándolo a medio terminar en 6 de 14
pantallas. Se detuvo solo al notar ediciones concurrentes del proceso
principal y avisó explícitamente del desvío en su reporte final. Se
revisó manualmente y se completó el trabajo de forma consistente en las
26 instancias (ver "Errores de formulario" arriba) porque el motivo de
fondo era válido (sección 4 de DISEÑO.md), pero quede claro que **no fue
una instrucción dada**: quedó documentado para que el usuario lo sepa.

## Fase 6 — Responsive final, accesibilidad y limpieza

**Técnica de prueba usada**: la herramienta de automatización no puede
cambiar el ancho real de la ventana del navegador (`resize_window` reporta
éxito pero `window.innerWidth` no cambia). En su lugar se probó con un
`<iframe>` del mismo origen, con `width`/`height` fijos, apuntando al
servidor de desarrollo — se confirmó con `iframe.contentWindow.innerWidth`
que así se obtiene un viewport real e independiente al que las media
queries responden correctamente. Se verificó 375px (equivalente a 360px
para este propósito), 768px y 1280px, con datos reales de forma (login,
registro) y con datos de prueba inyectados por `window.ng.applyChanges`
sobre los signals de cada pantalla cuando no había backend disponible
(comparador de ofertas, seguimiento de pedido) — nunca inventando campos:
los mismos que ya consume cada plantilla.

Se encontraron y corrigieron tres desbordes horizontales reales, todos de
CSS puro (ningún `.ts` tocado):

- **Barra superior a 375px**: el bloque `.sesion` (nombre y rol de la
  persona) es un hijo flex que, sin `min-width: 0`, no se encoge por
  debajo del ancho de su propio texto — un desborde clásico de flexbox.
  El logo y los botones fijos tampoco cabían ya con el espaciado normal.
  Arreglado con `min-width: 0` + `overflow: hidden` + `text-overflow:
  ellipsis` en `.sesion`, `flex-shrink: 0` en los elementos fijos, y un
  `@media (max-width: 480px)` que reduce el espaciado de la barra y
  oculta el texto de sesión (el nombre completo sigue disponible en
  `768px` y más).
- **Chips de categoría a 375px** (`.chips-categoria`, nueva solicitud):
  el mismo problema de encogimiento, pero en una grilla: un `grid item`
  tampoco se encoge por debajo de su contenido sin `min-width: 0`, así
  que nombres como "Suspensión" forzaban la columna a crecer y desbordar
  la grilla de 3 columnas que pide la sección 10. Arreglado con
  `min-width: 0` en `.chip-categoria` y `text-overflow: ellipsis` en el
  nombre como respaldo; pero con 3 columnas fijas casi todos los nombres
  quedaban truncados en un celular real, así que se agregó
  `@media (max-width: 599px) { grid-template-columns: repeat(2, 1fr); }`
  — mismo diseño de tarjeta con ícono, solo con más aire por fila en
  pantallas angostas.
- **Tabla comparadora** (`.tabla-comparacion`): las celdas usaban
  `height: 52px` (fijo). Cuando una celda apila dos líneas — el precio
  más el distintivo "Mejor precio", o el estado "Enviada" más el botón
  "Aceptar oferta" — ese contenido se salía de los 52px y se solapaba
  visualmente con la fila siguiente, en cualquier ancho (se vio en
  768px y 1280px; a <720px la tabla usa su otro layout, en tarjetas
  apiladas, que no tiene este problema). Arreglado cambiando `height` por
  `min-height`: las filas de una sola línea miden igual, las que apilan
  contenido crecen en vez de desbordar.

**Foco de teclado**: se confirmó tabulando con teclado real (no solo
`.focus()` por script) que `:focus-visible { box-shadow: var(--anillo-foco)
}` se aplica tanto a elementos nativos (enlaces del menú) como a
componentes de Angular Material (`mat-stroked-button` "Salir"), incluso
sobre el rojo de la barra superior — el anillo blanco + oscuro se ve con
buen contraste en ambos fondos.

**`prefers-reduced-motion`**: el proyecto no define ninguna propiedad
`transition` propia en todo `apps/frontend/src` (se verificó con una
búsqueda completa); el único movimiento posible vendría de Angular
Material, que no está usando `@angular/animations` (ver nota de la Fase 5
sobre el diálogo de confirmación). El token `--duracion` ya cae a `0ms`
bajo esa media query en `_tokens.scss`, correcto y listo si en el futuro
se agrega alguna transición propia, pero hoy no tiene nada que mitigar:
riesgo bajo, no se forzó ninguna animación nueva solo para tener algo que
reducir.

**CSS muerto**: se repasaron las 16 clases globales de primer nivel de
`_globales.scss` contra su uso real en plantillas (incluyendo las que
viven en un `template:` inline de un `.ts`, no solo `.html`). Todas están
en uso salvo `.aviso`, que no es un descuido: su comentario explícita que
es el `panelClass` preparado para una futura migración a `MatSnackBar`,
decisión que la Fase 5 ya documentó como diferida a después de v1.0. No
se tocó. No quedan restos del tema azul anterior (sin coincidencias de
hex ni nombres de paleta azul en ningún `.scss`).

**Pantallas cubiertas a fondo** (las 3 anchuras, con build y 209/209
pruebas verdes después de cada cambio): login, registro, la barra/menú
autenticado (incluida la apertura del menú hamburguesa en 375px), nueva
solicitud (chips + formulario completo), detalle de solicitud con el
comparador de ofertas (incluido el caso de empate en "Mejor precio" y un
nombre de proveedor largo) y seguimiento de pedido (línea de tiempo
vertical en 375px, horizontal en 768px y 1280px).

### Pasada adicional: las 8 pantallas restantes

Con la misma técnica de iframe, en secuencia y sin sub-agentes (editar
estilos globales con ediciones concurrentes es fácil que choquen), se
probaron en 360/768/1280px las 8 pantallas que habían quedado fuera de la
primera pasada: ofertar, pedidos del proveedor, perfil comercial, pago,
mis pedidos, mis vehículos, categorías y aprobación de proveedores. Los
tres roles (comprador, proveedor, admin) se simularon escribiendo
directamente `repuestosya_token`/`repuestosya_usuario` en `localStorage`
(mismas claves que usa `AuthFacade`), y cada pantalla se probó con datos
de prueba con los casos límite ya conocidos: nombres de proveedor o de
categoría largos, motivo de rechazo largo, oferta empatada, formulario de
rechazo abierto.

Se encontró y corrigió un cuarto desborde horizontal, de la misma familia
que los tres de arriba:

- **Listas de pedidos en grid** (`mis-pedidos.component.scss` y
  `pedidos-proveedor.component.scss`, ambas con `<ul class="lista">` de
  tarjetas `app-order-card`): `.lista { display: grid; gap: ...; }` sin
  `grid-template-columns` deja la única columna en modo implícito
  `auto`, que — igual que un flex item sin `min-width: 0` — no se encoge
  por debajo del `min-content` de su contenido. Con dos tarjetas de
  pedido reales (nombre de proveedor largo, varios datos cortos en
  `.datos`), la columna se ensanchaba ~28px más que el viewport a 375px.
  Arreglado agregando `grid-template-columns: minmax(0, 1fr);` en ambos
  archivos — misma tarjeta, ahora su contenido envuelve en vez de
  desbordar. Confirmado con el recorrido de `getBoundingClientRect()` de
  cada elemento (no solo `scrollWidth` del documento, que no siempre
  refleja el desborde real dentro de un `<iframe>`).

El resto de las 8 pantallas no tenía ningún problema de desborde en
ninguno de los tres anchos; se revisaron también los formularios de una
y dos columnas, el badge "Mejor precio"/"Pendiente de aprobación" al
lado de títulos largos, el QR de pago, y el formulario de motivo de
rechazo. Build limpio y 209/209 pruebas verdes después del fix.

Con esto, las 16 pantallas de `docs/frontend.md` quedaron probadas con la
técnica de iframe en 360/768/1280px al menos una vez durante la Fase 6.

## Fase 7 (pausa) — Ajuste de escritorio contra el modelo de rediseño

Con el ensayo de Fase 7 en curso, se detectó que el frontend en escritorio no
coincidía con el modelo de referencia en `docs/UI/RepuestosYa propuesta de
rediseño-project` (export de la herramienta de diseño, servido local con
`python -m http.server` y comparado en el navegador junto al `ng serve` del
repo, ambos contra el backend ya levantado en Docker). Se pausó el ensayo
para corregirlo en dos tandas.

### Primera tanda (ya aprobada antes de esta sesión)

- Contenido centrado en vez de alineado a la izquierda (`layout.component.scss`,
  `margin-inline: auto`), acorde a la sección 6 ya corregida en DISEÑO.md.
- `moneda.pipe` nuevo (Bs sin decimales si el monto es entero, con dos si
  tiene centavos; muestra el código tal cual si la moneda no es BOB) en vez
  del `DecimalPipe` suelto con separador manual, en las 6 pantallas que
  muestran precio.
- Pago y Ofertar: grid/fila de dos columnas desde 1024px en vez de una sola
  columna angosta.

### Segunda tanda: patrón de fila y pantallas del modelo

El modelo usa, en Mis solicitudes, Solicitudes abiertas y Proveedores
pendientes, un patrón de fila (ícono circular + contenido + estados + acción,
separadas por borde) en vez de una tarjeta por elemento. Se agregó como clase
global reutilizable (`_globales.scss`): `.lista-filas` (panel contenedor) +
`.fila` (+ elementos `__icono`, `__contenido`, `__categoria`, `__titulo`,
`__meta`, `__estados`, `__accion`). Se aplicó en:

- **Mis solicitudes / Solicitudes abiertas**: comparten `tarjeta-solicitud`
  (ya era dumb y compartido), que pasó de tarjeta a fila; la acción de cada
  fila se inyecta por content projection (`<ng-content select="[accion]">`)
  en vez de ir fuera del componente, porque cada pantalla necesita un texto y
  una ruta de acción distintos. Mis solicitudes agrega el contador
  singular/plural y el enlace por estado (Ver solicitud/Ver ofertas/Ver
  pedido); Solicitudes abiertas agrega el subtítulo.
- **Mis pedidos (comprador y proveedor)**: comparten `order-card` (mismo
  patrón que `tarjeta-solicitud`), con precio y estado a la derecha.
- **Mis vehículos y Proveedores pendientes**: usan `.fila` directo (sin
  componente compartido, cada una es la única pantalla de su lista).
- **Nueva solicitud**: subtítulo nuevo; la urgencia pasa de `mat-select` a
  `mat-button-toggle-group` (único import nuevo, `MatButtonToggleModule`)
  atado al mismo `formControlName`, con roving tabindex de Material (Tab
  entra al valor seleccionado, flechas cambian de opción) — se confirmó con
  teclado real, no solo `.focus()` por script.
- **Comparador**: el encabezado deja de reutilizar `tarjeta-solicitud` (ya es
  una fila, no sirve para este layout) y pasa a su propio panel con chips de
  categoría/urgencia, "Solicitud N" a la derecha y la foto al lado del texto.
  El badge de estado de la oferta deja de mostrarse mientras está "Enviada"
  (SUBMITTED): es el estado por defecto y no aporta nada verlo en cada fila;
  sigue mostrándose para Aceptada/No elegida/Retirada. El precio ya estaba
  alineado a la derecha desde antes (columna `.num` de `.tabla-comparacion`).
- **Seguimiento**: grid de 2 columnas desde 1024px (stepper + aviso/acción a
  la izquierda, bloque de Pago a la derecha). "Confirmar recepción" queda
  integrado en el mismo aviso de "El pedido fue entregado…" en vez de un
  panel aparte. El bloque de Pago ahora se muestra siempre, no solo cuando ya
  existe el pago: antes de pagar, Método/Referencia muestran "—" y Estado
  dice "Pendiente" (DISEÑO.md sección 10: Pago Pendiente/Confirmado). El
  primer paso del stepper sigue siendo "Pendiente de pago", sin tocar
  `order-timeline`.

**No se aplicó** (quedó fuera a pedido explícito, para después de la v1.0):
conteo de ofertas en la fila, ciudad como `select`, repuesto separado de la
descripción, dirección de retiro en el aviso de "listo para retiro",
descripción del proveedor en su fila, acción "Ver perfil" y vehículo
preseleccionado en Nueva solicitud.

### Bug real encontrado al construir `.lista-filas`

El borde que separa una fila de la siguiente no se veía en ningún caso: la
regla era `.fila:last-child { border-bottom: none }`, pero cuando la fila la
pone un componente compartido (`app-tarjeta-solicitud`, `app-order-card`),
`.fila` es la **única** hija de ese componente — por lo tanto siempre es
`:last-child` de su propio envoltorio, sin importar su posición real en la
lista. Se verificó con `getComputedStyle(...).borderBottomWidth` en el
navegador (las tres filas de una prueba daban `0px`) antes de corregirlo.
Arreglado moviendo el borde a `.lista-filas > *` (el hijo directo real,
sea el componente o `.fila` sin envoltorio) y `.lista-filas > :last-child`
para quitarlo solo en la última fila de verdad.

### Verificación

`ng build` sin errores, `ng test` 212/212 en las dos rondas (antes y después
de la segunda tanda); dos aserciones de prueba ajustadas porque verificaban
el comportamiento viejo a propósito cambiado: `AdminProveedoresComponent`
(el teléfono se había movido sin querer fuera de la fila — error real,
corregido agregándolo de vuelta), `OrderCardComponent` (los días estimados
de entrega, mismo caso), y `DetalleSolicitudComponent` (la prueba de la
oferta `WITHDRAWN` esperaba ver "Enviada" en la `SUBMITTED` de al lado — eso
sí era el cambio de diseño pedido, se actualizó la aserción). Revisión visual
con `ng serve` del repo principal contra el backend de Docker, con sesiones
reales de comprador/proveedor/admin, en 360/768/1280/1920px (360 y 1920 con
un `<iframe>` del mismo origen, igual técnica que en la Fase 6, porque
`resize_window` seguía sin cambiar `window.innerWidth` en este entorno; 1280
confirmado visualmente para que el grid de 2 columnas de Seguimiento se vea
activo). Sin desbordes horizontales en ninguna de las 9 pantallas tocadas.

## Preguntas de la defensa

1. **¿Por qué el tema no usa directamente el rojo exacto de la marca?**
   Porque Angular Material genera la paleta completa (los "tonos" de M3) a
   partir de una paleta base; no hay una forma de decirle "este hex exacto
   es el primary" sin pasar por esa generación. Se usa la paleta roja más
   cercana que trae Material y se sobrescriben las variables de sistema que
   importan (`--mat-sys-primary` y afines) con el hex exacto de DISEÑO.md,
   que es justo el mecanismo que la sección 7 del documento pide usar.

2. **¿Cómo se decide cuál oferta es la de "Mejor precio" cuando hay un
   empate?** `mejorPrecio` (un `computed` en `detalle-solicitud`) filtra
   las ofertas `SUBMITTED`, saca el precio mínimo con `Number(...)` para
   comparar correctamente (no como texto) y marca con el distintivo a
   *todas* las ofertas que igualan ese mínimo, no solo la primera — por
   eso en el ejemplo de prueba las dos ofertas de 180.50 llevan el mismo
   badge.

3. **¿Por qué el seguimiento de pedido muestra siempre 4 pasos fijos y no
   el historial completo de cambios de estado?** Porque la sección 9 de
   DISEÑO.md pide una línea de tiempo de 4 pasos fijos, no el historial
   crudo del backend. `OrderTimelineComponent` arma esos 4 pasos (el
   tercero cambia de "En camino" a "Listo para retiro" según
   `deliveryType`) y busca en el historial real la fecha de cada uno; si
   el pedido está en un estado que no es ninguno de los 4 (hoy, solo
   `COMPLETED`), ese estado se muestra aparte en tono neutro sin romper
   la línea de tiempo.

4. **¿Cómo se probó el diseño responsive sin poder cambiar el ancho real
   de la ventana del navegador?** Con un `<iframe>` del mismo origen y
   ancho/alto fijos apuntando al propio servidor de desarrollo: al ser
   mismo origen, `iframe.contentWindow.innerWidth` confirma un viewport
   real e independiente, y las media queries del CSS responden a ese
   ancho igual que lo harían en una ventana física de ese tamaño.

5. **¿Por qué varias pantallas usan `window.ng.applyChanges` con datos de
   prueba en vez de datos reales del backend durante el diseño?** Porque
   gran parte del trabajo de esta fase se hizo sin los microservicios
   corriendo. `window.ng` es la API de depuración que el propio Angular
   expone en modo desarrollo: permite tomar el componente ya instanciado
   de una pantalla y llamar a sus signals exactamente como lo haría el
   código real (`solicitud.set(...)`, `ofertas.set(...)`), así que lo que
   se ve es el layout real reaccionando a datos con la misma forma que
   los que vendrían de la API — nunca un campo o endpoint inventado.
