# Convenciones de código

> Este documento es **obligatorio** para todos los integrantes y para sus agentes de IA.
> Cualquier cambio a estas reglas se hace mediante Pull Request.

## 1. Nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Carpetas y archivos | `kebab-case` | `part-request-service/`, `partRequest.model.js` |
| Clases (Python/TS) | `PascalCase` | `CreateOfferUseCase`, `PartRequest` |
| Variables y funciones | `camelCase` | `createOffer`, `userEmail` |
| Constantes globales | `UPPER_SNAKE_CASE` | `MAX_OFFERS_PER_REQUEST` |
| Tablas de BD | `snake_case` plural | `part_requests`, `offers` |
| Columnas de BD | `snake_case` | `vehicle_brand`, `created_at` |
| Endpoints | `kebab-case` en minúscula | `/api/v1/part-requests` |
| Variables de entorno | `UPPER_SNAKE_CASE` | `DB_PART_REQUEST_PORT` |

## 2. Endpoints y versionado

- Todas las rutas llevan versión: `/api/v1/...`
- Recursos en plural: `/api/v1/offers`, no `/api/v1/offer`
- El frontend **nunca** habla directo con un microservicio. Siempre pasa por el Gateway en el puerto `4000`.

## 3. Respuestas HTTP

Todo microservicio responde con este envelope. Se estandarizó tomando como
base el formato que ya usaba el backend PHP (antes de migrarlo a Django).

**Éxito:**
```json
{
  "status": 200,
  "msg": "Operación exitosa",
  "data": { }
}
```

**Error:**
```json
{
  "status": 400,
  "msg": "El campo 'email' es obligatorio",
  "data": null
}
```

- `status` coincide con el código HTTP.
- `msg` es legible para humanos, en español.
- `data` es `null` en errores.

## 4. Códigos de estado HTTP

| Código | Cuándo |
|---|---|
| `200` | Lectura o actualización exitosa |
| `201` | Recurso creado |
| `400` | Datos inválidos o falta un campo obligatorio |
| `401` | Sin token o token inválido/expirado |
| `403` | Token válido pero el rol no tiene permiso |
| `404` | Recurso no encontrado |
| `409` | Conflicto (ej. email ya registrado, oferta ya aceptada) |
| `422` | Regla de negocio violada |
| `500` | Error interno (nunca exponer el stack trace) |

## 5. Ramas y commits

**Ramas:**
- `main` — producción simulada. **Protegida**, sin push directo.
- `develop` — rama de integración. **Protegida**, solo vía PR.
- `feature/<área>-<descripción>` — `feature/offer-create-offer`
- `fix/<área>-<descripción>` — `fix/order-status-transition`
- `hotfix/<descripción>` — nace de `main`, se sincroniza con `develop`

**Commits — cortos, con palabras clave:**

Formato: `tipo(área): palabras clave`

```
feat(offer): validación oferta única
fix(order): transición estado inválida
test(identity): login credenciales inválidas
docs(contracts): payload ORDER_CREATED
refactor(part-request): creación a caso de uso
chore(infra): healthcheck db-offer
```

Sin verbos de relleno (`agregar`, `implementar`, `corregir`) ni frases
completas: **el tipo de commit ya dice qué se hizo**. Máximo 4 palabras
después de los dos puntos.

Alcance entre paréntesis: `identity`, `part-request`, `offer`, `order`,
`catalog`, `notification`, `gateway`, `frontend`, `infra`, `contracts`, `docs`.

## 6. Arquitectura por microservicio (DDD + arquitectura limpia)

Cada servicio de Express sigue esta estructura. El de Django adapt las
mismas capas con sus propias convenciones (ver `docs/arquitectura.md`).

```
src/
├── domain/              # Sin dependencias de Express ni de la BD
│   ├── entities/        # Entidades y value objects
│   ├── enums/           # Estados, tipos, roles
│   ├── errors/          # Errores de dominio (OfferAlreadyAcceptedException)
│   └── repositories/    # Interfaces (contratos), NO implementaciones
├── application/
│   ├── commands/        # Casos de escritura  (CreateOfferCommand)
│   ├── queries/         # Casos de lectura    (GetOffersByRequestQuery)
│   └── ports/           # Interfaces hacia el exterior (EventPublisher)
├── infrastructure/
│   ├── persistence/     # Implementación de repositories (Sequelize)
│   ├── messaging/       # Productor/consumidor RabbitMQ
│   └── config/          # Configuración, conexión a BD
├── presentation/
│   └── http/            # Controllers y rutas. Delgados.
└── server.js            # Solo ensambla y arranca
```

**Reglas de dependencia (hexagonal / clean architecture):**
- `domain/` no importa nada de `infrastructure/`, `presentation/` ni de Express.
- `application/` depende de `domain/`, nunca al revés.
- Los repositorios en `domain/` son **interfaces**; la implementación real vive en `infrastructure/persistence/`.
- Los controllers en `presentation/http/` solo orquestan: validan DTO → llaman un caso de uso → devuelven respuesta.

## 7. Reglas duras del negocio

Hay dos reglas que **no se negocian** y deben garantizarse en backend y en
base de datos, nunca solo ocultando botones en el frontend:

1. **Una sola oferta aceptada por solicitud.** Se garantiza con un índice
   `UNIQUE` parcial en la BD más `SELECT ... FOR UPDATE` antes de validar.
2. **El pedido se genera únicamente a partir de una oferta aceptada.** El
   Order Service solo reacciona al evento `OFFER_ACCEPTED`.

## 8. Bases de datos

- Cada microservicio es **dueño exclusivo** de su base de datos.
- **Prohibido** que un servicio haga `JOIN` o consultas directas a la base de otro.
- Si un servicio necesita datos de otro, lo pide por **HTTP** o consume su **evento**.
- Un servicio **nunca** importa entidades de otro servicio.

## 9. Variables de entorno

- Documentar toda variable nueva en `.env.example` antes de usarla.
- **Nunca** subir un `.env` real a Git.
- **Nunca** hardcodear secretos, puertos o URLs en el código fuente.

## 10. Agentes de IA

Cada integrante puede usar el agente que prefiera (Claude Code, Codex,
OpenCode, Copilot...). Lo que **no** se puede cambiar es el resultado:

- Todas las skills viven en `.agents/skills/` y se versionan con PR.
- Antes de pedir cambios a un agente, se le indica leer `AGENTS.md`.
- Todo código generado se revisa antes de mergear. El agente no reemplaza la revisión.
- Si un agente propone una violación de esta guía, se corrige antes del PR.
