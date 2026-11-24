# RepuestosYa: sistema visual del frontend (v2)

Este documento define cómo se ve el frontend Angular. Es la referencia para el rediseño: cualquier pantalla nueva o modificada sale de aquí. El rediseño cambia la presentación, no las reglas de negocio.

Versión 2: logo oficial y paleta roja en la línea de PedidosYa. Reemplaza la paleta azul y la tipografía Barlow de la versión anterior.

## 1. Contexto

- Producto: marketplace de repuestos automotrices con "subasta al revés". El comprador publica qué repuesto necesita, los proveedores envían ofertas, el comprador acepta una sola y sigue su pedido.
- Roles y pantallas:
  - Comprador: mis solicitudes, nueva solicitud, detalle de solicitud con comparador de ofertas, mis pedidos con seguimiento, mis vehículos.
  - Proveedor: perfil comercial, solicitudes abiertas (filtros por ciudad y categoría), mis ofertas, mis pedidos.
  - Administrador: proveedores pendientes de aprobación, categorías.
- Datos de una solicitud: categoría, vehículo, descripción, ciudad, urgencia (baja, media, alta) y foto opcional.
- Reglas visibles en la interfaz: una solicitud acepta una sola oferta y al aceptarla las demás quedan como no elegidas; el pago es simulado (QR) y nunca guarda datos de tarjeta.
- Base técnica: Angular Material, hoy con el tema azul por defecto. Se mantiene Material y se le aplica el tema de este documento.

## 2. Dirección: rojo de marca

- Rojo dominante en la barra superior y en las acciones principales, fondo claro, texto casi negro, como PedidosYa.
- Formas suaves que siguen al logo: esquinas redondeadas y titulares en itálica gruesa.
- Lo memorable son la barra roja con el logo y los titulares en itálica, que solo aparecen en el inicio de sesión y en "Nueva solicitud". Todo lo demás es limpio y tranquilo.
- El rojo se reserva para marca, acción principal, urgencia alta y errores. Si todo es rojo, nada destaca.

## 3. Logo

Archivos (carpeta `brand/` entregada junto a este documento):

| Archivo | Uso |
|---|---|
| `logo-blanco.svg` | Barra superior roja y panel rojo del login |
| `logo-rojo.svg` | Fondos blancos (formulario de login en móvil, pantallas de error) |
| `isotipo-blanco.svg` / `isotipo-rojo.svg` | Barra lateral colapsada, cargas, espacios pequeños |
| `favicon.ico`, `favicon-512.png`, `apple-touch-icon.png` | Pestaña del navegador e íconos |
| `logo-*.png`, `isotipo-*.png` | Respaldo si algo no acepta SVG |

Reglas:
- Alto mínimo del logo completo: 24px. Por debajo de eso, usar el isotipo.
- Espacio libre alrededor: al menos la mitad del alto del logo.
- El logo blanco solo va sobre rojo; el rojo solo va sobre blanco o gris claro.
- No deformar, no cambiar colores, no agregar sombras ni contornos, no escribir "RepuestosYa" en texto al lado del logo.
- El atributo `alt` es "RepuestosYa".

## 4. Color

| Token | Hex | Uso |
|---|---|---|
| Rojo | `#EA044E` | Rojo de marca (el de PedidosYa). Barra superior, panel del login, botón primario, bordes de botones, logo rojo y favicon |
| Rojo oscuro | `#C2033F` | Enlaces de texto y hover o presionado de los botones rojos |
| Rojo tenue | `#FDE8EF` | Fondo del ítem activo del menú, de chips seleccionados y de urgencia alta |
| Rojo texto | `#B0033C` | Texto sobre rojo tenue, mensajes de error, hover de enlaces |
| Fondo | `#F5F5F7` | Fondo de la aplicación |
| Superficie | `#FFFFFF` | Paneles, tablas, formularios, barra lateral |
| Superficie 2 | `#FAFAFB` | Encabezado de tablas, hover de filas |
| Borde | `#E2E2E8` | Divisores y bordes de paneles |
| Borde fuerte | `#8E8E9B` | Borde de campos de formulario |
| Tinta | `#1E1E26` | Texto principal |
| Tinta suave | `#5F5F6E` | Texto secundario, metadatos, ayudas |

Estados (fondo tenue + texto oscuro del mismo tono):

| Tono | Texto | Fondo |
|---|---|---|
| Éxito | `#1E6B40` | `#E3F4EA` |
| Atención | `#7A4F00` | `#FFF1D6` (marca puntual `#F5A623`) |
| Información | `#1D5A9E` | `#E6F0FB` |
| Neutro | `#5F5F6E` | `#EEEEF2` |
| Peligro | `#B0033C` | `#FDE8EF` |

Reglas:
- Blanco sobre `#EA044E` cumple AA justo (4.5:1), así que sirve para la barra, el panel del login y los botones. El rojo sobre el fondo gris `#F5F5F7` no llega a AA, por eso los enlaces de texto usan rojo oscuro.
- El logo rojo, el isotipo y el favicon usan este mismo `#EA044E`.
- Un solo botón rojo por sección. Cancelar, rechazar y volver son botones secundarios, no rojos.
- Un error siempre lleva ícono y texto, no solo color.
- Nada de degradados, texturas ni modo oscuro.

## 5. Tipografía

**Rubik** (paquete `@fontsource/rubik`): sus esquinas redondeadas acompañan al logo. Una sola familia para todo.

| Token | Tamaño | Peso | Uso |
|---|---|---|---|
| `--texto-display` | 39px | 800 itálica | Titular del login y de "Nueva solicitud" |
| `--texto-2xl` | 31px | 700 | Título de página |
| `--texto-xl` | 25px | 700 | Títulos de sección, nombre del repuesto en el detalle |
| `--texto-lg` | 20px | 600 | Subtítulos, precios |
| `--texto-base` | 16px | 400 | Texto general |
| `--texto-sm` | 14px | 500 | Etiquetas de campo, encabezados de tabla, estados, menú |
| `--texto-xs` | 13px | 400 | Metadatos y ayudas |

Reglas:
- Títulos con interlineado 1.15; texto con 1.5.
- La itálica gruesa solo en los dos titulares indicados.
- Mayúscula solo al inicio de la frase, en todo. Nada en mayúsculas sostenidas.
- Precios, códigos, fechas y cantidades con `font-variant-numeric: tabular-nums`; en tablas, alineados a la derecha.
- Párrafos de lectura con un ancho máximo de 75 caracteres.

## 6. Forma y espacio

- Radios con jerarquía: controles (botones, campos) 8px, paneles 12px, chips y estados en forma de pastilla.
- Separación por bordes de 1px, no por sombras. La única sombra es la de los elementos flotantes: menús, diálogos y avisos.
- Escala de espacio de 4px: 4, 8, 12, 16, 24, 32, 48, 64.
- Contenido centrado en el espacio disponible, ancho máximo 1440px.

## 7. Angular Material

- Generar la paleta del tema a partir del rojo (`ng generate @angular/material:theme-color` si la versión instalada lo trae) y reemplazar el tema azul por defecto.
- Si el tono que genera Material no coincide con el token, sobrescribir las variables del sistema de Material (`--mat-sys-primary`, `--mat-sys-on-primary` y afines) con los tokens de este documento.
- Tipografía del tema: Rubik.
- Radios y alturas con los mecanismos de personalización de la versión instalada, no con `!important`.
- Íconos: los PNG propios de la sección 10 donde existan; para el resto, la librería de íconos de Material que ya usa el proyecto (estilo redondeado). Nada de emojis.
- Avisos con `MatSnackBar` usando las clases de estado de este documento.

## 8. Estructura

### Escritorio (≥ 1024px)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [logo blanco]                               (campana 3)  Nombre  Salir │  ← barra roja 56px
├────────────────┬─────────────────────────────────────────────────────┤
│ ▌Mis solicitudes│ Título de la página                [Acción principal] │
│  Nueva solicitud│ Texto de apoyo                                        │
│  Mis pedidos    ├─────────────────────────────────────────────────────┤
│  Mis vehículos  │                                                       │
│                 │ Contenido (máx. 1440px, centrado)                     │
│                 │                                                       │
└────────────────┴─────────────────────────────────────────────────────┘
```

- Barra superior roja de 56px a todo el ancho: logo blanco de 28px de alto a la izquierda; a la derecha campana con contador, nombre y rol del usuario, y "Salir" como botón con borde blanco.
- Contador de notificaciones: pastilla blanca con número en rojo.
- Barra lateral blanca de 240px con borde derecho. Cada ítem lleva ícono de 20px y texto de 14px. Ítem activo: fondo rojo tenue con texto e ícono en rojo texto; los inactivos, texto tinta con ícono en tinta suave.
- El título de la página va en el contenido, no en la barra roja.

### Móvil y tablet (< 1024px)

- Barra roja con botón de menú, logo y campana. El menú se abre como panel lateral.
- La acción principal pasa debajo del título, a ancho completo.
- Tablas y filas de comparación pasan a bloques apilados (< 720px) con pares "etiqueta: valor" y acciones a ancho completo.

## 9. Pantallas

**Inicio de sesión y registro**
```
┌──────────────────────────────┬───────────────────────────┐
│ [logo blanco grande]         │ Iniciar sesión            │
│                              │ Correo electrónico        │
│ Pide tu repuesto,            │ [                       ] │
│ recibe ofertas.              │ Contraseña                │
│                              │ [                       ] │
│ 1  Publicas lo que necesitas │ [ Iniciar sesión        ] │
│ 2  Comparas las ofertas      │ ¿No tienes cuenta?        │
│ 3  Aceptas una y sigues      │ Crear cuenta              │
│    tu pedido                 │                           │
└──────────────────────────────┴───────────────────────────┘
```
- Panel izquierdo en rojo con el logo blanco, el titular en itálica gruesa y los tres pasos numerados (son una secuencia real).
- En móvil: franja roja con el logo arriba y el formulario debajo, sin los pasos.

**Mis solicitudes (comprador)**: subtítulo con el contador ("1 solicitud" / "4 solicitudes"; sin texto si la lista está vacía, ahí va el vacío). Lista en filas (sección 10: ícono de categoría, repuesto, vehículo, ciudad y antigüedad, urgencia y estado). La acción de cada fila cambia según el estado: "Ver solicitud" (publicada, sin ofertas), "Ver ofertas" (recibiendo ofertas) o "Ver pedido" (oferta aceptada o completada). Botón principal "Publicar solicitud".

**Nueva solicitud**: titular "¿Qué repuesto necesitas?" en itálica gruesa, con el subtítulo "Los proveedores verán tu solicitud y te enviarán sus ofertas." Categorías como chips con ícono (el seleccionado en rojo tenue con borde rojo). Luego vehículo, descripción, ciudad y urgencia (chips de un solo valor, usables con teclado) en dos columnas, y foto opcional con vista previa. Botón final "Publicar solicitud" a ancho completo.

**Detalle de solicitud y comparador de ofertas**
```
┌──────────────────────────────────────────────────────────────┐
│ (Frenos) (Urgencia alta)                       Solicitud 231  │
│ Pastillas de freno delanteras                                 │
│ Toyota Corolla 2018, Santa Cruz, publicada hace 2 días        │
│ Se escuchan chirriar al frenar.                               │
└──────────────────────────────────────────────────────────────┘
Ofertas recibidas (3). Solo puedes aceptar una. Las demás quedarán como no elegidas.
┌────────────────────┬──────────┬───────────────────┬─────────────────┬───────────┐
│ Proveedor          │   Precio │ Entrega           │ Nota            │           │
├────────────────────┼──────────┼───────────────────┼─────────────────┼───────────┤
│ Repuestos Oriente  │ Bs 420   │ Listo para retiro │ Original, gar.  │ [Aceptar] │
│ Taller Frenos Sur  │ Bs 465   │ 2 días            │ Incluye instal. │ [Aceptar] │
│ AutoPartes Lara    │ Bs 399   │ 3 días            │ Genérico        │ [Aceptar] │
│                    │ (Mejor   │                   │                 │           │
│                    │  precio) │                   │                 │           │
└────────────────────┴──────────┴───────────────────┴─────────────────┴───────────┘
```
- El precio va alineado a la derecha de su columna. La oferta más barata lleva el estado "Mejor precio" (tono atención) debajo del precio.
- El badge de estado de la oferta **no se muestra mientras está "Enviada"** (sería ruido: es el estado por defecto); sí se muestra para Aceptada, No elegida y Retirada.
- "Aceptar" usa el botón con borde rojo: hay uno por fila y ninguno debe competir con el resto de la pantalla.
- Al aceptar: diálogo de confirmación ("Aceptar la oferta de Repuestos Oriente por Bs 420. Las demás ofertas quedarán como no elegidas."), luego un aviso de éxito con "Ver pedido", la fila aceptada con fondo verde muy tenue (`#F1FAF4`) y estado "Aceptada", y las demás con texto en tinta suave y estado "No elegida". Sin bajar la opacidad.

**Solicitudes abiertas (proveedor)**: subtítulo "Compradores que todavía esperan ofertas." Filtros de ciudad (input) y categoría (select) arriba; la misma lista en filas que ve el comprador, con la acción "Enviar oferta" en cada una, salvo si el proveedor ya tiene una oferta activa (no retirada) en esa solicitud: ahí la fila muestra "Ya ofertaste" y el enlace "Ver mi oferta" (a "Mis ofertas": no hay pantalla de detalle de una sola oferta).

**Mis ofertas (proveedor)**: tabla con repuesto, comprador o ciudad, precio, fecha y estado (pendiente, aceptada, no elegida).

**Mis pedidos (comprador y proveedor) y Mis vehículos**: mismo patrón de fila que las listas de solicitudes (ícono, contenido, estados, acción), con subtítulo con el contador. En Mis pedidos, precio y estado a la derecha; la acción (si existe) es la del siguiente paso para el proveedor, o ninguna para el comprador (la fila entera enlaza al seguimiento).

**Seguimiento del pedido**
```
 ◉──────────────○──────────────○──────────────○
 Pendiente      Preparando     Listo para     Entregado
 de pago                       retiro
```
- Pasos completados en verde, paso actual con anillo rojo y texto en negrita, pasos futuros en gris. El primer paso siempre es "Pendiente de pago" (no "Confirmado"): el pedido nace así y pasa a "Preparando" recién cuando se paga.
- Desde escritorio (≥1024px), grid de dos columnas: a la izquierda el stepper, el aviso de lo que sigue (información, por ejemplo mientras se prepara) y la acción que corresponda ("Pagar ahora" si está pendiente de pago); a la derecha el bloque de Pago. En móvil y tablet, una sola columna, pago debajo.
- "Confirmar recepción" va integrado dentro del mismo aviso informativo de "El pedido fue entregado…", no en un panel aparte.
- Bloque de pago: pares etiqueta-valor (Método, Referencia, Total, Estado) y la nota "Pago simulado. No se guardan datos de tarjeta." Antes de pagar, Método y Referencia muestran "—" y Estado dice "Pendiente"; tras pagar, "Confirmado".
- Un pedido cancelado no usa los pasos: estado neutro y el motivo si existe.

**Proveedores pendientes (admin)**: filas con ícono, nombre, ciudad y teléfono, categorías y "Solicitó el alta el" con la fecha; acciones "Aprobar" (primario) y "Rechazar" (secundario, pide el motivo). Subtítulo con el contador ("N proveedores por revisar" en el filtro de pendientes, "N proveedores" en los demás). Sin "Ver perfil".

**Categorías (admin)**: tabla simple con nombre, ícono y acciones.

## 10. Componentes

**Botones** (altura 44px, radio 8px, Rubik 500 15px)
- Primario: fondo rojo, texto blanco. Uno por sección.
- Con borde rojo: fondo blanco, borde y texto rojo. Para la acción que se repite en cada fila ("Enviar oferta", "Aceptar").
- Secundario: fondo blanco, borde fuerte, texto tinta.
- Texto: sin borde, texto rojo. Para acciones menores.
- Deshabilitado: opacidad 0.5.
- Texto del botón: verbo + objeto ("Publicar solicitud", "Enviar oferta", "Aceptar oferta"). Sin flechas ni signos "+".

**Campos**: etiqueta arriba (14px, 500), campo de 44px, borde fuerte, radio 8px. Foco: borde tinta + anillo de foco. Error: borde y texto rojo texto con ícono, y un mensaje que dice cómo corregirlo ("Ingresa el año del vehículo, por ejemplo 2018").

**Páginas que son un formulario** (Nueva solicitud, Perfil comercial, Ofertar): toda la página, título incluido, centrada en un ancho de lectura de 880px (`.pagina-formulario`), con los campos en dos columnas en escritorio (`.dos-columnas`) y una sola columna en móvil. No ocupan los 1440px de `.contenido`: un formulario de ese ancho sería incómodo de leer y llenar.

**Formularios de alta sobre una lista** (Registrar vehículo, Nueva categoría): el panel ocupa todo el ancho, igual que la lista de abajo (`.fila-alta`): los campos en una sola fila con el botón al final desde escritorio, 2 columnas en tablet, 1 en móvil.

**Estados**

| Qué | Valor | Tono |
|---|---|---|
| Urgencia | Baja / Media / Alta | Neutro / Atención / Peligro |
| Solicitud | Abierta / Con ofertas / Oferta aceptada / Cerrada | Información / Atención / Éxito / Neutro |
| Oferta | Pendiente / Aceptada / No elegida | Atención / Éxito / Neutro |
| Pedido | Confirmado, Preparando, En camino, Listo para retiro / Entregado / Cancelado | Información / Éxito / Neutro |
| Pago | Pendiente / Confirmado | Atención / Éxito |
| Proveedor | Pendiente / Aprobado / Rechazado | Atención / Éxito / Neutro |

Los nombres exactos salen de los enums reales del proyecto.

**Íconos propios** (PNG negros sin fondo, 256×256, entregados en `iconos.zip`):

| Archivo | Dónde va |
|---|---|
| `iconos/notificaciones.png` | Campana de la barra superior |
| `iconos/mis-solicitudes.png` | Menú: Mis solicitudes |
| `iconos/nueva-solicitud.png` | Menú: Nueva solicitud |
| `iconos/mis-pedidos.png` | Menú: Mis pedidos (comprador y proveedor) |
| `iconos/mis-vehiculos.png` | Menú: Mis vehículos, y junto al vehículo en listas y detalles |
| `iconos/salir.png` | Botón "Salir" de la barra superior |
| `iconos/agregar-foto.png` | Botón "Agregar foto" y espacio de la foto del repuesto cuando no hay imagen |
| `categorias/frenos.png`, `motor.png`, `suspension.png`, `electrico.png`, `carroceria.png`, `neumaticos.png` | Cada categoría: listas, chips de nueva solicitud, detalle |

- Se aplican con `mask-image` y `background-color: currentColor`, así toman el color del texto: gris en reposo, rojo en el ítem activo o el chip seleccionado, blanco en la barra roja. Ejemplo: `.icono{width:20px;height:20px;background-color:currentColor;mask:url(/assets/iconos/mis-pedidos.png) center/contain no-repeat}`.
- El resto de íconos (menú, ubicación, hora, QR, volver, filtros, perfil comercial, solicitudes abiertas, mis ofertas, admin) siguen siendo de Material.
- Como las categorías las crea el admin, una categoría sin PNG usa el ícono `build` de Material.

**Chips de categoría** (nueva solicitud): grilla de 3 columnas, alto 56px, ícono de 24px + nombre. Seleccionado: borde rojo, fondo rojo tenue, texto rojo texto.

**Tablas y filas**: encabezado en superficie 2, 14px 500 en tinta suave; filas de 52px con borde inferior; hover en superficie 2; números a la derecha.

**Notificaciones**: lista con punto rojo en las no leídas y fecha relativa a la derecha.

**Avisos**: abajo a la derecha (arriba a ancho completo en móvil), fondo blanco, sombra flotante e ícono del tono a la izquierda del texto. Mismo verbo que la acción: "Publicar solicitud" produce "Solicitud publicada".

**Carga**: barra de progreso de Material en el área que carga; botones con "Enviando…" y deshabilitados mientras esperan.

**Vacíos**: una frase con lo que va ahí y la acción para llenarlo. "Aún no tienes solicitudes. Publica la primera y los proveedores te enviarán ofertas." + "Publicar solicitud".

**Errores del servidor**: qué pasó y qué hacer, sin disculpas ni mensajes técnicos. "No se pudo enviar la oferta. Revisa tu conexión e inténtalo de nuevo."

## 11. Texto de interfaz

- Español neutro, tuteo, voz activa, frases cortas.
- Nombres que entiende el usuario: "Mis pedidos", no "Listado de órdenes".
- Una acción conserva el mismo nombre en botón, título del diálogo y aviso.
- Identificadores en texto normal ("Solicitud 231", "Pedido 89").
- Moneda: "Bs 420" (con decimales solo si el dato los tiene).

## 12. Movimiento, accesibilidad y responsive

- Movimiento solo como respuesta a una acción (abrir menú, diálogo o aviso; cambiar un estado), 150ms. Sin animaciones de entrada por sección. Con `prefers-reduced-motion: reduce` se desactiva.
- Contraste AA en todo el texto (los tokens ya lo cumplen).
- Foco visible en todo lo interactivo con `--anillo-foco` (oscuro, para que se vea también sobre rojo).
- Áreas táctiles de al menos 44px.
- Probar en 360px, 768px y 1280px.

## 13. Lo que no se hace

- Emojis como íconos.
- Calificaciones con estrellas u otros datos que el sistema todavía no tiene.
- Mayúsculas sostenidas en etiquetas, estados o botones.
- Flechas o "+" en el texto de botones y enlaces.
- Fuente monoespaciada para códigos o precios.
- Datos separados con puntos medios ("A · B · C"): se usan comas o columnas.
- Degradados, modo oscuro, colores fuera de los tokens.

## 14. Tokens (copiar tal cual en `src/styles/_tokens.scss`)

```scss
:root {
  /* Marca */
  --color-rojo: #EA044E;
  --color-rojo-oscuro: #C2033F;
  --color-rojo-tenue: #FDE8EF;
  --color-rojo-texto: #B0033C;

  /* Neutros */
  --color-fondo: #F5F5F7;
  --color-superficie: #FFFFFF;
  --color-superficie-2: #FAFAFB;
  --color-borde: #E2E2E8;
  --color-borde-fuerte: #8E8E9B;
  --color-tinta: #1E1E26;
  --color-tinta-suave: #5F5F6E;

  /* Estados */
  --color-exito: #1E6B40;
  --color-exito-tenue: #E3F4EA;
  --color-atencion: #F5A623;
  --color-atencion-texto: #7A4F00;
  --color-atencion-tenue: #FFF1D6;
  --color-info: #1D5A9E;
  --color-info-tenue: #E6F0FB;
  --color-neutro: #5F5F6E;
  --color-neutro-tenue: #EEEEF2;
  --color-peligro: #B0033C;
  --color-peligro-tenue: #FDE8EF;

  /* Tipografía */
  --fuente: 'Rubik', system-ui, sans-serif;
  --texto-xs: 0.8125rem;
  --texto-sm: 0.875rem;
  --texto-base: 1rem;
  --texto-lg: 1.25rem;
  --texto-xl: 1.5625rem;
  --texto-2xl: 1.9375rem;
  --texto-display: 2.4375rem;
  --interlineado-titulo: 1.15;
  --interlineado-texto: 1.5;

  /* Espacio */
  --esp-1: 4px;
  --esp-2: 8px;
  --esp-3: 12px;
  --esp-4: 16px;
  --esp-5: 24px;
  --esp-6: 32px;
  --esp-7: 48px;
  --esp-8: 64px;

  /* Forma */
  --radio-control: 8px;
  --radio-panel: 12px;
  --radio-pastilla: 999px;
  --sombra-flotante: 0 8px 24px rgba(30, 30, 38, 0.16);
  --anillo-foco: 0 0 0 2px #FFFFFF, 0 0 0 4px var(--color-tinta);

  /* Estructura */
  --alto-barra-superior: 56px;
  --ancho-barra-lateral: 240px;
  --ancho-contenido: 1440px;
  --alto-control: 44px;

  /* Movimiento */
  --duracion: 150ms;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duracion: 0ms;
  }
}
```

Clases globales previstas (en `src/styles/`): `.barra-superior`, `.barra-lateral`, `.encabezado-pagina`, `.panel`, `.lista-filas` + `.fila` (fila de lista: ícono circular, contenido, estados y acción, separadas por borde), `.pagina-formulario` (centra una página-formulario en 880px), `.dos-columnas` (dos columnas de formulario, una en móvil), `.fila-alta` (formulario de alta sobre una lista: una fila en escritorio, 2 columnas en tablet, 1 en móvil), `.estado` con variantes `--exito`, `--atencion`, `--info`, `--neutro`, `--peligro`, `.chip-categoria`, `.tabla-comparacion`, `.pasos`, `.vacio`, `.aviso`. Los botones, campos, diálogos y avisos son los de Angular Material con el tema aplicado.
