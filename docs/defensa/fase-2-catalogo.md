# Defensa — Fase 2, Catálogo completo (bloque A1)

## Qué se hizo

Sobre lo que ya existía (lectura pública de categorías), se agregó:

- **Admin de categorías** (`/api/v1/admin/categories`, solo rol `ADMIN`):
  `GET` todas (incluidas inactivas), `POST` crear, `PUT :id` editar,
  `PATCH :id/toggle` activar/desactivar. Nunca se borra una categoría.
- **Vehículos del comprador** (`/api/v1/vehicles`, solo rol `COMPRADOR`):
  agregado nuevo completo (`domain` → `infrastructure` → `presentation`).
  `GET /mine`, `POST` (crea), `DELETE :id` (solo el dueño).
- **`GET /api/v1/categories/{id}`** ahora se documenta explícitamente en
  `docs/contratos-api.md`: devuelve `active` siempre, incluso en `false`,
  porque Negociación (fase 2, bloque A2) lo necesita para rechazar
  solicitudes con una categoría desactivada.
- **Guard de rol** (`RolesGuard` + `@Roles(...)`, patrón estándar de Nest
  con `Reflector`): reutilizable, se aplicó a los dos controllers nuevos
  con roles distintos (`ADMIN` en uno, `COMPRADOR` en el otro).
- **`ValidationPipe` global con `whitelist: true`**: cualquier campo que no
  esté en el DTO se descarta del body antes de llegar al caso de uso — así
  `owner_id` nunca puede venir manipulado desde el cliente, aunque alguien
  lo mande a mano.

## El patrón que vale explicar: nombre único sin importar mayúsculas

El `UNIQUE` de Postgres en `categories.name` es sensible a mayúsculas por
defecto, así que "Frenos" y "frenos" no chocarían solos en la base. Se
resolvió en la capa de aplicación: antes de crear o editar, `CreateCategoryCommand`
y `UpdateCategoryCommand` preguntan al repositorio `findByNameInsensitive`
(usa `LOWER(name) = LOWER(:name)` en la consulta), y si hay coincidencia
lanzan `CategoryNameConflictError` → `409`. Al editar, se excluye el propio
`id` para no chocar contra sí misma. Es una comprobación a nivel de
aplicación, no un índice de base de datos: para este caso (el admin es un
solo actor, cambios poco frecuentes) la ventana de carrera es aceptable; es
distinto del caso de "una sola oferta aceptada" en Negociación, que sí
necesita el índice `UNIQUE` en la base porque ahí compiten peticiones
concurrentes de verdad.

## Cómo se probó

- 48 pruebas (Jest) en todo el servicio, repositorio mockeado: dominio
  (`Category.withEdits/toggled`, `Vehicle.isOwnedBy`), los 5 comandos/
  queries nuevos, `RolesGuard` (incluye un PROVEEDOR y un ADMIN rechazados
  en `/vehicles`, que es solo de COMPRADOR), los 2 controllers nuevos y los
  3 errores nuevos mapeados en el filtro de excepciones.
- `npm run build` compila sin errores.
- **Verificación real completa en Docker, por el Gateway** (los 9
  contenedores healthy, reconstruyendo solo `catalogo`):
  - Admin crea "Accesorios" (`201`) y la desactiva (`PATCH .../toggle` →
    `active: false`); `GET /categories/11` (sin rol admin) sigue devolviendo
    `active: false` en vez de `404`.
  - Crear de nuevo con `"accesorios"` (minúsculas) → `409`.
  - Comprador registra un vehículo mandando además `owner_id: 999` en el
    body → se ignora, el vehículo queda con el `ownerId` real del JWT.
  - Vehículo con `year: 1900` → `400` (`year must not be less than 1950`).
  - Un PROVEEDOR pidiendo `/vehicles/mine` → `403`; un COMPRADOR pidiendo
    `/admin/categories` → `403`.
  - El dueño borra su propio vehículo → `200`.

## Limitaciones

- La unicidad de nombre case-insensitive no tiene respaldo a nivel de
  índice en la base (ver arriba); si en algún momento se permite que varios
  admins creen categorías al mismo tiempo, convendría agregar un índice
  funcional (`LOWER(name)`).
- No se agregó un endpoint de borrado físico de categorías (no está en el
  contrato): solo existe `toggle`.
