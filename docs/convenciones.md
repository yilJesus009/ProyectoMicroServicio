# Convenciones

Obligatorias para los integrantes y sus agentes de IA.

## 1. Idioma

- **Código en inglés:** clases, funciones, variables, tablas, columnas, enums
  y eventos.
- **En español:** textos que ve el usuario, mensajes `msg` de las respuestas,
  documentos y commits.
- **Excepción (ya implementado, no se cambia):** los roles `COMPRADOR`,
  `PROVEEDOR`, `ADMIN`, la urgencia `BAJA`, `MEDIA`, `ALTA` y los campos del
  registro de Identidad (`nombre`, `contrasena`, `telefono`, `ciudad`, `rol`).

## 2. Nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Carpetas de servicios | español, minúsculas | `apps/negociacion` |
| Archivos JS/TS | `camelCase` o `kebab-case` según el framework | `acceptOffer.js`, `category.service.ts` |
| Clases | `PascalCase` | `AcceptOfferCommand`, `Order` |
| Variables y funciones | `camelCase` (Java/JS/TS), `snake_case` (Python) | `acceptOffer`, `approve_supplier` |
| Tablas | `snake_case` plural | `part_requests`, `offers` |
| Columnas | `snake_case` | `buyer_id`, `created_at` |
| Enums y eventos | `MAYUSCULAS_SNAKE_CASE` | `OFFER_ACCEPTED`, `READY_FOR_PICKUP` |
| Endpoints | `kebab-case`, plural, versionados | `/api/v1/part-requests` |
| Variables de entorno | `MAYUSCULAS_SNAKE_CASE` | `DB_NEGOCIACION_PASSWORD` |

## 3. Respuesta HTTP

Todo servicio responde con el mismo sobre.

```json
{ "status": 200, "msg": "Operación exitosa", "data": { } }
```

```json
{ "status": 422, "msg": "La solicitud ya no acepta ofertas", "data": null }
```

- `status` coincide con el código HTTP.
- `msg` en español, legible para el usuario.
- `data` es `null` en errores. Nunca exponer el stack trace.
- Los campos del cuerpo JSON van en `snake_case`.

## 4. Códigos HTTP

| Código | Cuándo |
|---|---|
| 200 | Lectura o actualización exitosa |
| 201 | Recurso creado |
| 400 | Datos inválidos o falta un campo |
| 401 | Sin token o token inválido |
| 403 | Token válido pero sin permiso (rol, dueño o proveedor no aprobado) |
| 404 | No existe |
| 409 | Conflicto: la solicitud ya tiene una oferta aceptada, el email ya existe |
| 422 | Regla de negocio violada: transición de estado inválida, solicitud cerrada |
| 500 | Error interno |

## 5. Ramas y commits

- `main`: versión para presentar. `develop`: integración. Nadie hace push
  directo a ninguna de las dos.
- Ramas: `feature/<area>-<tarea>` → `feature/negociacion-ofertas`.
- PR hacia `develop`, revisado por el otro integrante.
- Commits cortos: `tipo(área): palabras clave` (máximo 4 palabras).

```
feat(negociacion): aceptar oferta
fix(pedidos): transicion invalida
test(catalogo): categorias inactivas
chore(infra): esquemas postgres
docs(defensa): fase 2
```

Áreas: `gateway`, `identidad`, `negociacion`, `pedidos`, `catalogo`,
`notificaciones`, `frontend`, `infra`, `docs`, `defensa`.

## 6. Variables de entorno

- Toda variable nueva va primero en `.env.example`.
- Nunca subir un `.env` real.
- Nunca escribir secretos, puertos ni URLs fijos en el código.
- Dentro de Docker, los servicios se encuentran por el **nombre del
  contenedor** (`http://negociacion:4001`), nunca por `localhost`.
