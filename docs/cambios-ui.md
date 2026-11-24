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

## Preguntas de la defensa

(Se completa en la fase final con el resto de preguntas probables.)

1. **¿Por qué el tema no usa directamente el rojo exacto de la marca?**
   Porque Angular Material genera la paleta completa (los "tonos" de M3) a
   partir de una paleta base; no hay una forma de decirle "este hex exacto
   es el primary" sin pasar por esa generación. Se usa la paleta roja más
   cercana que trae Material y se sobrescriben las variables de sistema que
   importan (`--mat-sys-primary` y afines) con el hex exacto de DISEÑO.md,
   que es justo el mecanismo que la sección 7 del documento pide usar.
