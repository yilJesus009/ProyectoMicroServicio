# Defensa — Fase 1, Catálogo

## Qué se hizo

`apps/catalogo` (NestJS) con las 4 capas (`domain/application/infrastructure/
presentation`):

- **`GET /api/v1/categories`**: devuelve las categorías activas, protegido
  por JWT (cualquier usuario autenticado).
- **`GET /api/v1/categories/{id}`**: una categoría puntual; `404` si no
  existe. La va a usar Negociación en la fase 2 para validar `category_id`
  al crear una solicitud.
- **`GET /health`**: fuera del prefijo `/api/v1` (el Gateway lo consulta en
  la raíz, igual que los demás servicios).
- **Siembra automática**: al iniciar, si la tabla `categories` está vacía,
  se insertan las 10 categorías fijas de `docs/modelo-datos.md`. Verificado
  que un reinicio no las duplica.
- Esquema propio `catalogo` en el PostgreSQL compartido, con su propio
  usuario (`catalogo_user`).
- `Dockerfile` multi-stage (build con `nest build`, runtime solo con
  dependencias de producción).

## El patrón que vale explicar

**El dominio no conoce el ORM.** `domain/entities/category.ts` es una clase
sin decoradores ni imports de TypeORM — nada de infraestructura se filtra
ahí (AGENTS.md §7). La entidad de TypeORM
(`infrastructure/persistence/category.orm-entity.ts`) es un objeto aparte,
y `CategoryMapper` traduce entre las dos en cada punto donde el repositorio
cruza la frontera. Si algún día se cambia TypeORM por otro ORM, o se agrega
una representación distinta de `Category`, el dominio no se toca.

La interfaz `CategoryRepository` (clase abstracta) vive en `domain/`; la
implementación (`TypeOrmCategoryRepository`) vive en `infrastructure/` y se
inyecta en `app.module.ts`. Las queries de `application/` solo conocen la
interfaz, nunca a TypeORM directamente — se pueden probar con un
repositorio falso, sin levantar una base real (así están las pruebas).

## Cómo se probó

- 14 pruebas unitarias (Jest) con el repositorio mockeado: dominio, las dos
  queries, la siembra, el guard JWT, el controller y el filtro de errores.
  Todas pasan (`npm test`).
- `npm run build` compila sin errores de TypeScript.
- Verificación manual de punta a punta: Postgres suelto en un contenedor
  temporal (fuera de `docker-compose.yml`, se destruyó al terminar), con el
  esquema y usuario `catalogo` creados a mano. Se confirmó por HTTP real:
  - `GET /health` → `{"service":"catalogo","status":"OK"}`.
  - `GET /api/v1/categories` sin token → `401`.
  - Con un JWT firmado con `JWT_SECRET` → `200` y las 10 categorías, en el
    sobre `{status, msg, data}`.
  - `GET /api/v1/categories/1` → `200`; `/999` → `404`; `/abc` → `400`.
  - Reinicio del servicio: sigue habiendo 10 categorías (no se duplican).

Un bug real que apareció y se corrigió en este proceso: TypeORM no puede
inferir el tipo de columna para `string | null` sin un `type` explícito en
`@Column()` (lanzaba `DataTypeNotSupportedError` al arrancar). Se corrigió
agregando `type: 'varchar'` en `description` e `icon`.

## Limitaciones

- No se probó **a través del Gateway**: el ruteo a Catálogo lo agrega el
  bloque B1 (Jesús) junto con el resto de rutas del Gateway.
- `docker-compose.yml` todavía no tiene el Postgres compartido con
  esquemas (eso es del bloque B1); por eso el servicio `catalogo` no se
  agregó ahí todavía — queda listo para pegarse cuando se avise.
- No hay migraciones (Flyway/TypeORM migrations): se usa
  `synchronize: true` de TypeORM porque todavía no hay un runner de
  migraciones en este servicio. Aceptable para esta fase según
  `docs/arquitectura.md` ("sincronización o migrations"); conviene pasar a
  migraciones antes de la entrega final si hay tiempo.
- Las categorías para `admin` (crear, editar, activar/desactivar) y los
  vehículos del comprador quedan para la fase 2, según el plan.
