# Defensa — Fase 3, Pantallas del flujo (bloque B1)

## Qué se hizo

Todas las pantallas del flujo principal en Angular standalone, una *facade*
por dominio (`apps/frontend/src/app/facades/`) y un smart component por
pantalla sobre componentes dumb reutilizables (`OfferCardComponent`,
badges de estado, timeline):

- **Comprador:** comparador de ofertas en `/comprador/solicitudes/:id`
  (orden por precio o por días, aceptar con confirmación inline y el
  `msg` del backend si responde 409/422), "Generando tu pedido…"
  consultando `GET /orders/by-offer/{offerId}` cada 2 s hasta que Pedidos
  crea el pedido, pantalla de pago simulado con pestañas QR y tarjeta
  (`/comprador/pedidos/:id/pago`), lista y seguimiento con línea de
  tiempo y botón "Confirmar recepción".
- **Proveedor:** formulario de oferta (`/proveedor/solicitudes/:id/ofertar`),
  mis ofertas con botón retirar, y `/proveedor/pedidos` con el botón de
  avanzar que corresponde a `delivery_type` (entrega → `IN_TRANSIT`,
  retiro → `READY_FOR_PICKUP`).

## El patrón que vale explicar: el pedido no se crea, se espera

Regla 3: no existe endpoint para crear pedidos — el pedido nace del evento
`OFFER_ACCEPTED`. La pantalla no fuerza nada: tras aceptar, entra en
*polling* de `by-offer/{offerId}`, tolera el `404` mientras el outbox
publica y el consumidor de Pedidos crea el pedido, y recién entonces
navega al pago. El frontend se adapta al backend en vez de inventar un
camino paralelo, y si el evento se perdiera el usuario vería el mensaje
de "generando" con su error, no un estado fantasma.

## Pago simulado: solo `{ method }`

La pantalla muestra los campos de tarjeta (QR y pestaña CARD) pero
**nunca** los envía: el body es exactamente `{"method": "QR" | "CARD"}`.
El backend lo garantiza con validación estricta (`400` si llega cualquier
campo extra, verificado en vivo con `card_number` y `cvv`), y el QR se
dibuja localmente con **quiet zone de 4 módulos** (`matrizQr()` lo embebe)
para que cualquier lector lo decodifique.

## Cómo se probó

- **197 pruebas unitarias de frontend** (`ng test`, ChromeHeadless) y
  `ng build --configuration production` sin errores (860 kB iniciales).
- **e2e `scripts/e2e-flujo.mjs`: 29/29** contra Docker con **base limpia**
  (`down -v && up --build` + `seed-demo`), incluidos los negativos
  (doble pago 409, pago con datos de tarjeta 400, segunda oferta 409).
- **Recorrido de las 16 pantallas de `docs/frontend.md`** ejecutando
  exactamente las llamadas de cada facade contra el Gateway real:
  **111/111 OK** — sobre `{status,msg,data}`, campos que cada pantalla
  lee, ordenamientos del comparador, foto blob con los 4 casos de rol,
  links de la campanita y `401/403` de los guards en cada servicio.
- `GET /part-requests/{id}` devuelve `COMPLETED` tras confirmar la
  recepción (evento diferido por outbox: se verificó con reintento).

## Limitaciones

- Sin pase visual automatizado en navegador (no hay herramienta de
  browser en el repo): la verificación visual del flujo con dos
  navegadores queda para el ensayo de la fase 7.
- El *polling* de "Generando tu pedido…" se probó con el pedido real de
  Docker, no con un backend simulado que nunca responda (ese caso cubre
  el timeout del componente con prueba unitaria).
