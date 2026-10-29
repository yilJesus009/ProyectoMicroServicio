# Arranque del equipo

> **Esto es lo primero que pegas en tu agente de IA** (Claude Code, Codex,
> OpenCode, Copilot...) la primera vez que abras el repositorio.
>
> El repositorio tiene toda la documentación, pero **el agente no la lee
> solo**. Tú le dices qué leer. Ese es este mensaje.

---

## ¿Por qué hace falta?

Los agentes de IA **no leen el repositorio completo automáticamente**. Cada
herramienta carga solo un archivo de entrada:

| Herramienta | Archivo que carga solo | Luego |
|---|---|---|
| **Claude Code** | `CLAUDE.md` | Que apunta a `AGENTS.md` |
| **Codex** | `AGENTS.md` | Directo |
| **OpenCode** | `AGENTS.md` | Directo |
| **Copilot** | `.github/copilot-instructions.md` | Que apunta a `AGENTS.md` |

**Las skills en `.agents/skills/` tampoco se detectan solas** en todas las
herramientas. Cada una usa su propia carpeta (`.claude/skills/`,
`.codex/skills/`, etc.). Por eso el mensaje de abajo las nombra
explícitamente: así funcionan sin importar con qué agente trabajes.

---

## Mensaje de arranque

Copia el bloque de tu integrante y pégalo tal cual.

### 🟢 Jesús — `identity-service`

```
Trabajo en un monorepo de microservicios: Marketplace de repuestos automotrices.

Antes de tocar código, lee estos archivos:
- AGENTS.md (reglas del proyecto)
- CLAUDE.md
- docs/convenciones.md (nombres, respuestas, estructura)
- docs/contratos-api.md (endpoints del identity-service)
- docs/distribucion-equipo.md

MIS SERVICIOS: identity-service (Django, puerto 5000).
NO toques los demás servicios sin que yo lo pida explícitamente.

Skills relevantes, léelas:
- .agents/skills/django-backend/SKILL.md
- .agents/skills/clean-architecture-ddd/SKILL.md
- .agents/skills/api-contracts-events/SKILL.md

Rama de trabajo: git switch develop && git switch -c feature/identity-auth
Commits cortos: tipo(área): palabras clave  →  feat(identity): registro con roles
```

### 🔵 Dylan — `part-request-service`, `catalog-vehicle-service`

```
Trabajo en un monorepo de microservicios: Marketplace de repuestos automotrices.

Antes de tocar código, lee estos archivos:
- AGENTS.md (reglas del proyecto)
- CLAUDE.md
- docs/convenciones.md (nombres, respuestas, estructura)
- docs/contratos-api.md (endpoints de part-request y catalog)
- docs/distribucion-equipo.md

MIS SERVICIOS: part-request-service (Express, puerto 4001) y
catalog-vehicle-service (Express, puerto 4004).
NO toques los demás servicios sin que yo lo pida explícitamente.

Skills relevantes, léelas:
- .agents/skills/express-backend/SKILL.md
- .agents/skills/clean-architecture-ddd/SKILL.md
- .agents/skills/api-contracts-events/SKILL.md

part-request-service ya existe en apps/ y hay que reestructurarlo a las 4
capas (domain, application, infrastructure, presentation) y migrarlo de
SQLite a PostgreSQL. NO reescribir desde cero: mover el código existente.

Rama de trabajo: git switch develop && git switch -c feature/part-request-crud
Commits cortos: tipo(área): palabras clave  →  fix(part-request): migración postgres
```

### 🟡 Alexis — `offer-service`, `order-service`

```
Trabajo en un monorepo de microservicios: Marketplace de repuestos automotrices.

Antes de tocar código, lee estos archivos:
- AGENTS.md (reglas del proyecto)
- CLAUDE.md
- docs/convenciones.md (nombres, respuestas, estructura)
- docs/contratos-api.md (endpoints de offer y order)
- docs/eventos.md (payload de OFFER_ACCEPTED, ORDER_CREATED)
- docs/flujo-principal.md (la regla crítica)
- docs/distribucion-equipo.md

MIS SERVICIOS: offer-service (Express, puerto 4002) y
order-service (Express, puerto 4003).
NO toques los demás servicios sin que yo lo pida explícitamente.

REGLA CRÍTICA — es el requisito más importante del proyecto:
una solicitud puede recibir muchas ofertas, pero solo UNA puede ser aceptada.
Se garantiza en TRES capas:
  1. Índice UNIQUE parcial en PostgreSQL (WHERE status = 'ACCEPTED')
  2. La entidad Offer lanza OfferAlreadyAcceptedException
  3. El handler usa transacción con SELECT ... FOR UPDATE
NUNCA se garantiza solo ocultando botones en el frontend.
Y order-service SOLO crea pedidos consumiendo el evento OFFER_ACCEPTED.

Skills relevantes, léelas:
- .agents/skills/express-backend/SKILL.md
- .agents/skills/clean-architecture-ddd/SKILL.md
- .agents/skills/testing-quality/SKILL.md
- .agents/skills/api-contracts-events/SKILL.md

Rama de trabajo: git switch develop && git switch -c feature/offer-management
Commits cortos: tipo(área): palabras clave  →  feat(offer): validación oferta única
```

### 🔴 Latife — `api-gateway`, `notification-service`, `frontend`

```
Trabajo en un monorepo de microservicios: Marketplace de repuestos automotrices.

Antes de tocar código, lee estos archivos:
- AGENTS.md (reglas del proyecto)
- CLAUDE.md
- docs/convenciones.md (nombres, respuestas, estructura)
- docs/arquitectura.md (patrón de headers del Gateway)
- docs/contratos-api.md (todos los endpoints)
- docs/eventos.md (todos los eventos a consumir)
- docs/puertos.md (asignación de puertos y Docker)
- docs/distribucion-equipo.md

MIS ÁREAS: api-gateway (Express, puerto 4000), notification-service
(Express, puerto 4005) y frontend (Angular, puerto 4200).
También: docker-compose.yml, .env.example, infraestructura.
NO toques los demás servicios sin que yo lo pida explícitamente.

El Gateway hace dos cosas:
  1. Valida el JWT recibido del navegador
  2. Lo descompone en headers: X-User-Id, X-User-Roles, X-User-Email,
     X-Correlation-Id
PERO cada microservicio también valida la firma con el mismo JWT_SECRET.
El Gateway NO es el único que valida.

El frontend NUNCA habla directo con un microservicio: siempre pasa por
el Gateway (localhost:4000).

Skills relevantes, léelas:
- .agents/skills/express-backend/SKILL.md
- .agents/skills/angular-frontend/SKILL.md
- .agents/skills/api-contracts-events/SKILL.md
- .agents/skills/code-review-security/SKILL.md

Rama de trabajo: git switch develop && git switch -c feature/api-gateway
Commits cortos: tipo(área): palabras clave  →  feat(api-gateway): validación JWT
```

---

## Qué hacer si tu agente ignora las reglas

Si el agente propone algo que contradice `docs/`, **gana el docs/, no el
agente**. Pégale la sección relevante:

| Problema | Pega esto |
|---|---|
| Quiere importar código de otro servicio | `AGENTS.md` sección 4.2 (persistencia independiente) |
| Crea un endpoint sin documentarlo | `AGENTS.md` §7 punto 2 + `docs/contratos-api.md` |
| Simplifica la validación de ofertas | `AGENTS.md` sección 4.1 (regla crítica) |
| Mete lógica de negocio en el controller | `.agents/skills/clean-architecture-ddd/SKILL.md` |
| Escribe commits largos | `docs/convenciones.md` sección 5 |

---

## Orden de trabajo

1. `git switch develop`
2. Pegar tu mensaje de arranque.
3. `git switch -c feature/<tu-tarea>`
4. Trabajar.
5. Commits cortos: `feat(offer): validación oferta única`
6. `git push -u origin feature/<tu-tarea>`
7. Abrir PR hacia **`develop`** (nunca hacia `main`).

**Antes del PR:** correr las pruebas y verificar que el flujo principal de
`docs/flujo-principal.md` sigue funcionando.
