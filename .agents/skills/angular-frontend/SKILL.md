---
name: angular-frontend
description: Implementar el frontend en Angular (standalone + Material) para los tres roles (comprador, proveedor, admin). Estructura por features con patrón smart/dumb y facades, guards, interceptor JWT, consumo del API Gateway. Usar cuando se trabaja en apps/frontend.
---

# Angular Frontend

> **Angular es obligatorio** (requisito de la instructora). Habla **solo**
> con el Gateway (`environment.apiUrl = http://localhost:4000/api/v1`). Se
> sirve con nginx en Docker, puerto 4200.

## Antes de empezar

1. Leer `AGENTS.md`, `docs/frontend.md` (pantallas exactas por rol) y
   `docs/flujo-principal.md`.
2. Leer `docs/contratos-api.md` de los endpoints que vas a consumir.

## Estructura por features

```
src/app/
├── core/            interceptor JWT, guards por rol, sesión, manejo de errores
├── shared/          componentes dumb reutilizables (tarjetas, badges, timeline)
├── features/
│   ├── auth/        login, registro (elige COMPRADOR o PROVEEDOR)
│   ├── comprador/   solicitudes, comparador, pago, pedidos, vehículos
│   ├── proveedor/   perfil comercial, solicitudes abiertas, ofertas, pedidos
│   ├── admin/       proveedores pendientes, categorías
│   └── notificaciones/  campanita y lista
└── facades/         un servicio por dominio que habla con la API
```

`shared/` solo para lo realmente compartido entre features.

## Patrón smart / dumb

- **Smart** (uno por pantalla): usa una *facade* para pedir o enviar datos
  y reacciona a eventos de sus hijos.
- **Dumb**: recibe datos por `input()`, avisa con `output()`,
  `ChangeDetectionStrategy.OnPush`, no inyecta servicios.
- Ejemplo de reutilización: `OfferCardComponent` se usa en el comparador del
  comprador (botón "Aceptar") y en "Mis ofertas" del proveedor (botón
  "Retirar").

## Interceptor y guards

```typescript
// core/interceptors/auth.interceptor.ts
intercept(req, next) {
  const cloned = this.auth.token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${this.auth.token}` } })
    : req;
  return next.handle(cloned).pipe(
    catchError(err => { if (err.status === 401) this.auth.logout(); return throwError(() => err); })
  );
}
```

Guards por rol (`COMPRADOR`, `PROVEEDOR`, `ADMIN`) redirigen al panel de
cada rol. **Son solo comodidad visual**: si el backend responde `409` o
`422`, se muestra su `msg` aunque el frontend ya hubiera ocultado el botón.

## Rutas por rol (`docs/frontend.md`)

- **Comprador:** `/comprador/solicitudes`, `/solicitudes/nueva` (categoría
  en tarjetas, vehículo propio o escrito, foto, ciudad, urgencia),
  `/solicitudes/:id` (comparador ordenable + aceptar con confirmación),
  `/pedidos/:id/pago`, `/pedidos`, `/pedidos/:id` (timeline + "Confirmar
  recepción"), `/vehiculos`.
- **Proveedor:** `/proveedor/perfil`, `/solicitudes` (aviso si no está
  aprobado), `/solicitudes/:id/ofertar`, `/ofertas`, `/pedidos`.
- **Admin:** `/admin/proveedores` (aprobar/rechazar con motivo),
  `/admin/categorias` (listar, crear, editar, activar/desactivar).

Al aceptar una oferta: pantalla "Generando tu pedido…" haciendo polling a
`GET /orders/by-offer/{offerId}` cada 2 s hasta que exista, luego ir a pago.

## Pago simulado

Dos pestañas, **QR** y **Tarjeta** (datos de demo precargados, solo se
valida formato en el navegador). Se envía únicamente
`{ "method": "QR" }` o `{ "method": "CARD" }`: **los datos de tarjeta nunca
salen del navegador**. Aviso visible: "Simulación: no se realiza ningún
cobro".

## Campanita

Contador de no leídos cada 15 s, lista desplegable; clic navega al `link`
del aviso y lo marca leído. `takeUntil`/`take` siempre, para no dejar
polling huérfano.

## Los cuatro estados de cada pantalla con datos

Cargando (skeleton), vacío (mensaje), error (reintentar), con datos. Nunca
una tabla en blanco mientras carga.

## Pruebas

```bash
ng test    # Karma/Jasmine
ng build --configuration production
```

Priorizar: guards de rol, interceptor (token + 401), comparador de ofertas,
confirmación de aceptar oferta.

## Al terminar

`ng build` sin errores; `ng test` pasando; los cuatro estados cubiertos;
ninguna llamada directa a un microservicio (todo por el Gateway). Resumir
archivos modificados, pruebas realizadas, limitaciones.
