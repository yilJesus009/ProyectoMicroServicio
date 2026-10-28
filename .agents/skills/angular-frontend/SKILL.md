---
name: angular-frontend
description: Implementar el frontend en Angular para los flujos de solicitante y proveedor. Estructura por features con DDD, guards, interceptores, y consumo del API Gateway. Usar cuando se trabaja en apps/frontend.
---

# Angular Frontend

> **Angular es obligatorio** (requisito de la instructora). El frontend es la
> cara visible del proyecto: los dos flujos, solicitante y proveedor.

## Antes de empezar

1. Leer `AGENTS.md`.
2. Leer `docs/contratos-api.md` (los endpoints que vas a consumir).
3. Leer `docs/flujo-principal.md` (los flujos que vas a implementar).
4. Revisar la estructura existente de `apps/frontend/`.

## Regla de oro

> **El frontend nunca habla directo con un microservicio.** Siempre pasa por
> el API Gateway (`http://localhost:4000`).

Un solo `API_BASE_URL` en la configuración. Si algún día cambia el Gateway,
se cambia en un solo lugar.

```typescript
// core/config/api.config.ts
export const API_BASE_URL = 'http://localhost:4000';
```

## Estructura por features (DDD)

Organizar por **feature**, no por tipo de archivo. Dentro de cada feature,
las capas del dominio:

```
src/app/
├── core/                        # transversal a todo el app
│   ├── config/
│   ├── guards/                  # auth.guard, role.guard
│   ├── interceptors/            # auth.interceptor (adjunta el JWT)
│   ├── layouts/                 # main-layout, auth-layout
│   └── services/
├── features/
│   ├── auth/                    # login y registro
│   │   ├── domain/
│   │   ├── application/
│   │   └── presentation/
│   ├── requests/                # solicitudes (solicitante y proveedor)
│   ├── offers/                  # ofertas
│   ├── orders/                  # pedidos
│   └── profile/
├── shared/                      # componentes y utilidades reutilizables
│   ├── ui/                      # botones, tablas, cards, modales
│   └── pipes/
└── app.module.ts
```

**`shared/` solo para lo realmente compartido.** Si un componente lo usa una
feature, va dentro de esa feature. Ahí es donde un monorepo se convierte en
un monolito.

## El interceptor de autenticación

Un solo interceptor adjunta el JWT a todas las llamadas y maneja el `401`:

```typescript
// core/interceptors/auth.interceptor.ts
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.token;
    const cloned = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(cloned).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) this.auth.logout();   // token expirado
        return throwError(() => err);
      })
    );
  }
}
```

## Guards por rol

El frontend tiene **dos flujos** con permisos distintos. Los guards lo
reflejan, pero **son solo comodidad visual**: la autorización real vive en el
backend.

```typescript
// core/guards/role.guard.ts
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const expected = route.data['roles'] as string[];
    const actual   = this.auth.role;
    if (expected.includes(actual)) return true;
    this.router.navigate(['/']);       // o una página 403
    return false;
  }
}
```

```typescript
{ path: 'solicitudes/nueva', component: NuevaSolicitudPage,
  canActivate: [AuthGuard, RoleGuard], data: { roles: ['COMPRADOR'] } },

{ path: 'ofertas', component: OfertasPage,
  canActivate: [AuthGuard, RoleGuard], data: { roles: ['PROVEEDOR'] } },
```

> ⚠️ El PDF exige que la regla de una sola oferta aceptada se garantice en el
> **backend**. Ocultar el botón de "aceptar" cuando ya hay una oferta aceptada
> es una **comodidad**, no una garantía. El backend devuelve `409` aunque el
> frontend lo oculte, y eso es lo que se prueba.

## Estados de la interfaz

Todo componente con datos remotas debe manejar los **cuatro estados**. Es lo
que separa un frontend cuidado de uno improvisado.

- **Cargando** — spinner o skeleton.
- **Vacío** — "Aún no hay solicitudes publicadas."
- **Error** — mensaje y botón de reintentar.
- **Con datos** — el contenido.

No mostrar una tabla en blanco mientras carga: eso parece roto.

## El flujo del solicitante

```
/login
  → /solicitudes            lista de MIS solicitudes
  → /solicitudes/nueva      formulario: vehículo, descripción, foto, ciudad, urgencia
  → /solicitudes/:id        detalle + pestaña de ofertas recibidas
  → comparar ofertas        tabla: precio, marca, condición, disponibilidad, entrega
  → aceptar UNA oferta      confirmación explícita (es irreversible)
  → /pedidos/:id            seguimiento del pedido
  → confirmar finalización
```

**La comparación de ofertas es la pantalla más importante del proyecto.**
Mostrar las condiciones lado a lado en una tabla, resaltando la diferencia de
precio, disponibilidad y tiempo de entrega. No esconder la información detrás
de un modal.

**Antes de aceptar, un modal de confirmación** que advierta que es
irreversible y que las demás ofertas serán rechazadas.

## El flujo del proveedor

```
/login
  → /solicitudes-publicas    solicitudes PUBLISHED disponibles
  → /solicitudes-publicas/:id   detalle + formulario de oferta
  → /ofertas                 MIS ofertas con su estado
  → /pedidos                 pedidos donde soy proveedor
  → actualizar estado del pedido   PREPARING → SHIPPED → DELIVERED
```

## Espera del pedido

Cuando se acepta una oferta, el pedido se crea **asincrónicamente** (por
evento). Mostrar una pantalla de espera que consulte el estado:

```typescript
// polling cada 1.5s, con tope y cancelación
this.timer = interval(1500)
  .pipe(takeUntil(this.destroy$), switchMap(() => this.api.checkStatus(id)))
  .subscribe(res => {
    if (res.data.status !== 'PUBLISHED') {   // ya avanzó
      this.timer.unsubscribe();
      this.router.navigate(['/pedidos', res.data.orderId]);
    }
  });
```

**Siempre** `takeUntil` o `take` para evitar fugas de memoria y requests
huérfanas.

## Accesibilidad y UX

- Labels asociados a cada input. Nunca placeholder como única etiqueta.
- Estados de error junto al campo, no solo un toast.
- Formularios con validación en el cliente **y** en el servidor.
- Diseño responsive: el solicitante puede publicar desde el celular.
- Botones de acción destructiva con confirmación.
- Contraste suficiente en los textos.

## Pruebas

```bash
ng test          # unitarias (Karma/Jasmine)
ng e2e           # end-to-end (Playwright)
```

Priorizar pruebas de:
- Los guards de rol.
- El interceptor (adjunta el token, maneja `401`).
- La comparación de ofertas.
- El formulario de aceptar oferta y su confirmación.

## Al terminar

- `ng build` sin errores.
- `ng test` pasando.
- Los cuatro estados de carga cubiertos en las pantallas con datos.
- Ninguna llamada directa a un microservicio (todo por el Gateway).
- Resumir: archivos modificados, pruebas realizadas, limitaciones.
