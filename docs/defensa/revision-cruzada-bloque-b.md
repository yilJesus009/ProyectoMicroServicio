# Revisión cruzada — Bloque B (Gateway, Identidad, Frontend)

> Fase 5. Revisión de Dylan sobre el bloque de Jesús, con la skill
> `code-review-security` contra `AGENTS.md` y `docs/`. **No se corrigió
> nada en `apps/gateway`, `apps/identidad` ni `apps/frontend`** — son
> correcciones para que las aplique Jesús.

## Resumen

El bloque está bien construido: JWT verificado en cada servicio (no solo
en el Gateway), headers de identidad del cliente siempre borrados antes
de volver a escribirlos, rol exigido en el backend en cada endpoint
sensible, sin `.env` ni secretos commiteados, sin `innerHTML`/`eval` en
el frontend, el pago nunca manda datos de tarjeta, y los guards de
Angular están correctamente documentados como "solo comodidad" (la regla
real vive en el backend). Dos hallazgos no bloqueantes y una nota menor.

## Hallazgos

### 1. `IDENTITY_DEBUG` queda en `true` por defecto en Docker (moderado)

**Archivo:** `apps/identidad/identity_service/settings.py:58`
```python
DEBUG = os.environ.get("IDENTITY_DEBUG", "true").lower() == "true"
```
Ninguna variable `IDENTITY_DEBUG` existe en `.env.example` ni en
`docker-compose.yml`, así que en el entorno real (incluido el de la
demo) Django arranca con `DEBUG=True`. El handler de excepciones propio
(`core/exception_handler.py`) cubre los errores que pasan por una vista
de DRF, pero `DEBUG=True` sigue afectando cualquier error que ocurra
**antes** de llegar ahí (middleware, resolución de URL, un fallo en el
propio handler) — ahí Django muestra la página de debug completa: stack
trace y variables de `settings`. Es justo lo que la checklist de
seguridad pide evitar ("ningún 500 devuelve el stack trace al cliente")
y es la regla #1 de la propia guía de despliegue de Django.

**Cómo corregirlo:** invertir el valor por defecto a `"false"` en
`settings.py`, y agregar `IDENTITY_DEBUG=false` a `.env.example` (dejando
`true` solo como algo que se activa a mano en desarrollo local).

### 2. `USER_CREATED` no se publica con `transaction.on_commit` (bajo, inconsistencia)

**Archivo:** `apps/identidad/accounts/services/auth_service.py:62-76`

`supplier_service.py` publica sus tres eventos con `transaction.on_commit`
(con un comentario explícito: "nunca antes de persistir", `docs/eventos.md`
regla 3). `auth_service.create_user` publica `USER_CREATED` con una
llamada directa a `publisher.publish(...)`, sin ese envoltorio. Hoy no
falla porque `create_user` no está dentro de un `transaction.atomic()`
explícito y el proyecto no activa `ATOMIC_REQUESTS`, así que el
`INSERT` ya se autocommiteó antes de la llamada — pero es un
comportamiento implícito, no defensivo: si alguien activa
`ATOMIC_REQUESTS = True` más adelante (patrón común de Django), el
evento se publicaría **antes** del commit real, reintroduciendo
exactamente el bug que `supplier_service.py` ya resolvió.

**Cómo corregirlo:** envolver la llamada a `publisher.publish(...)` en
`auth_service.create_user` con `transaction.on_commit`, igual que el
patrón `_publish_after_commit` de `supplier_service.py`.

### 3. Comentario desactualizado sobre `localStorage` (muy menor, no bloqueante)

**Archivo:** `apps/frontend/src/app/facades/auth.facade.ts:20`
```ts
// El token vive en el navegador: sin él no hay forma de llamar al
// Gateway, y al cerrar el navegador se borra solo.
```
`localStorage` **no** se borra al cerrar el navegador (eso describiría
`sessionStorage`). El token sí se limpia correctamente en los dos casos
que importan — `cerrarSesion()` (botón "Salir") y el interceptor ante un
`401` en ruta protegida (`auth.interceptor.ts:37-39`) — así que esto no
es una falla de seguridad, solo un comentario que puede confundir a
quien lo lea después.

**Cómo corregirlo:** corregir el comentario (o cambiar a
`sessionStorage` si el equipo prefiere ese comportamiento real).

## Lo que se verificó explícitamente y está bien

- **Gateway** (`auth.middleware.js`): verifica la firma HS256 con
  `JWT_SECRET`, limpia `X-User-*` del request **antes** de procesarlo
  (`clearIdentityHeaders`) para que nadie pueda suplantar la identidad
  mandando esos headers directo; el rol no se decide acá, solo se reenvía.
- **CORS**: `origin` fijo al frontend (no `*`), headers permitidos
  explícitos.
- **Errores**: el gateway y el exception handler de Identidad nunca
  devuelven el stack trace; siempre el sobre `{status,msg,data}`.
- **Identidad**: contraseñas con `bcrypt_sha256` vía `set_password`
  (nunca en claro ni con `==`); `AUTH_PASSWORD_VALIDATORS` sí se aplica
  (se llama a mano en el serializer, con un comentario que explica por
  qué `set_password()` no basta); autorregistro de `ADMIN` bloqueado;
  `UserSerializer` nunca incluye el hash; aprobar/rechazar un perfil usa
  `select_for_update()` + chequeo de estado dentro del candado (dos
  admins no pueden aprobar el mismo perfil dos veces).
- **Frontend — lo que pidió el equipo verificar específicamente:**
  - El token vive en `localStorage` (`repuestosya_token`/`repuestosya_usuario`)
    y se borra en `cerrarSesion()` y ante cualquier `401` en ruta
    protegida (`auth.interceptor.ts`). Las rutas públicas (`/auth/login`,
    `/auth/register`) no disparan el cierre de sesión ante un 401 (sería
    un login en bucle).
  - `environment.ts` solo tiene `apiUrl`; ningún secreto.
  - El pago (`pago.component.ts` / `pedidos.facade.ts`) manda
    exclusivamente `{ method }` — confirmado con código y con una
    prueba real (`pago.component.spec.ts`) que verifica que el body
    serializado nunca contiene el número de tarjeta.
  - Los guards (`auth.guard.ts`) están comentados explícitamente como
    "solo comodidad": evitan mostrar pantallas que van a dar 403, pero
    la regla real vive en el backend — no hay ningún `if (rol === ...)`
    que reemplace una verificación de servidor.
  - Sin `innerHTML`, `eval` ni `new Function` en todo `apps/frontend/src`.
  - Ningún `.env` real en el historial de git; ningún secreto
    hardcodeado en gateway ni identidad.

## Prioridad para Jesús

1. Hallazgo 1 (`IDENTITY_DEBUG`) — bloqueante antes de la demo/producción.
2. Hallazgo 2 (`transaction.on_commit` en `auth_service`) — no bloqueante, alinear por consistencia.
3. Hallazgo 3 (comentario) — opcional, cuando toque ese archivo por otra razón.
