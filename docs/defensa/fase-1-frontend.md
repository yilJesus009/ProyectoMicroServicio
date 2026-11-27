# Fase 1 — Defensa: Frontend Angular (B2)

## Qué se hizo

- **`apps/frontend`** — Angular 20.3 + Angular Material, componentes
  standalone, servido por **nginx en el 4200** dentro de Docker
  (multi-stage: `node:20-alpine` compila, `nginx:1.27-alpine` sirve; la
  primera etapa usa el **mismo Node 20** que el job de CI). El navegador
  habla **solo con el Gateway** (`http://localhost:4000/api/v1`).
- **Todas las rutas de `docs/frontend.md`** (16) registradas desde la fase
  1 con `data.titulo`; en la fase 2 solo se cambia el `component` de cada
  una. Cada pantalla lleva `title` para la pestaña.
- **Autenticación:** `AuthFacade` (única puerta a `/auth/*`) guarda token +
  usuario en una *signal* y en `localStorage`; el registro hace
  `registroYEntrar` porque `POST /auth/register` devuelve 201 **sin token**.
- **Interceptor JWT:** agrega `Authorization: Bearer` a todo lo no público y
  cierra la sesión en un 401 — **excepto** en `/auth/login` y `/auth/register`
  (un 401 ahí son credenciales mal escritas, no sesión vencida; cerrar
  mandaría a la persona al login en bucle sin poder corregir su contraseña).
- **Guards:** `soloPublicoGuard` (públicas), `authGuard` en la ruta padre del
  layout y `roleGuard(...)` en cada hijo. Con un rol equivocado **no** se
  vuelve al login: se manda al panel de **su** rol (sigue autenticada).
- **Menú por rol** (`features/layout/menu.ts`): comprador, proveedor y
  administrador ven sus enlaces de `docs/frontend.md` y **no** los ajenos;
  el toolbar muestra nombre + rol y el botón *Salir*.
- **Docker:** servicio `frontend` en `docker-compose.yml` (puerto
  `"${FRONTEND_PORT:-4200}:4200"`, detrás de `gateway: service_healthy`,
  healthcheck con `wget` de busybox). **Ninguna variable nueva**:
  `FRONTEND_PORT`, `FRONTEND_ORIGIN` y `API_BASE_URL` ya estaban en
  `.env.example`.

## Patrón smart / dumb

- **Smart (uno por pantalla):** login, registro y layout. Leen/escriben a
  través de la *facade* y navegan según el rol que devuelve el backend.
- **Dumb:** `PaginaVaciaComponent` y el menú. Reciben datos por ruta/input,
  no tocan la API, van con `OnPush`.
- **Una facade por dominio:** en B2 solo hay un dominio (auth), así que
  `AuthFacade` es la **única** que habla con la API; no se creó un
  `AuthService` duplicado en `core/` (ahí viven interceptor, guards y tipos).

## Cómo explicarlo (respuesta corta para la defensa)

> «El frontend es una sola aplicación Angular con rutas por rol. La sesión
> vive en una *facade* que guarda el token en `localStorage`; un interceptor
> lo adjunta a cada petición y, si el backend responde 401 en una ruta
> protegida, cierra la sesión — pero nunca en el propio login, porque ahí un
> 401 es una contraseña mal escrita y no una sesión vencida. Los guards
> reflejan los roles: si entras con un rol equivocado no te echan, te llevan
> a tu panel. El menú es distinto para comprador, proveedor y admin.»

## Verificación ejecutada (2026-11-07)

| Prueba | Resultado |
|---|---|
| `npx ng build --configuration production` | OK (572.33 kB inicial) |
| `npx ng test --watch=false --browsers=ChromeHeadless` | **45/45 SUCCESS** |
| `docker compose build frontend` | OK (build en **Node 20**, el del CI) |
| `docker compose config --quiet` | OK |
| `docker compose down -v && docker compose up --build` | **9 contenedores healthy** |
| `GET /api/v1/health` | gateway/identidad/negociacion/pedidos/catalogo/notificaciones: **UP** |
| `GET /comprador/pedidos` en :4200 | HTTP 200 con `app-root` (fallback SPA) |
| `POST /auth/register` → `POST /auth/login` → `GET /auth/me` | 201 → 200 con token → 200 con el rol |
| Login con contraseña mala | `401 {"msg":"Credenciales incorrectas"}` |
| Registro con correo duplicado | `409 {"msg":"El correo … ya se encuentra registrado"}` |
| Captura Chrome headless | login, registro y layout de admin con menú por rol OK |

## Cómo verlo en vivo

```powershell
docker compose up --build
# 1. http://localhost:4200/registro  → crear comprador → entra a "Mis solicitudes"
# 2. http://localhost:4200/login     → credencial mala → mensaje del backend
# 3. Admin sembrado → "Proveedores pendientes" + "Categorías" en el menú
# 4. Salir → vuelve a /login; cambiar el rol y repetir el paso 2
```
