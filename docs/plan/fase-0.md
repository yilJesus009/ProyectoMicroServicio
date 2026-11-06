# Fase 0 — Preparar el repositorio (viernes 6)

**Objetivo:** que `develop` tenga todo el trabajo existente junto, con la
estructura de carpetas nueva y el contexto instalado. Lo hace **una sola
persona** para evitar conflictos (sugerido: quien creó las ramas).

**Antes de empezar:** descomprimir el paquete de contexto en la raíz del
repositorio, dentro de una carpeta llamada `_contexto/`.

## Prompt

```
Vamos a preparar el repositorio para el proyecto final. El contexto nuevo del
proyecto está en la carpeta _contexto/. Lee primero _contexto/AGENTS.md y
_contexto/docs/arquitectura.md.

Tareas, en este orden:

1. Desde develop, crea la rama chore/reorganizacion.

2. Integra estas ramas con merge, en este orden:
   origin/feature/identity-auth, origin/feature/api-gateway,
   origin/feature/part-request-4capas, origin/fix/team-handle-dylan.
   - Si hay conflictos solo en documentación (docs/, AGENTS.md, CLAUDE.md,
     README.md, .agents/), resuélvelos de cualquier forma: se reemplazan en el
     paso 4.
   - Si hay conflictos en código, configuración o CI, muéstramelos y
     propón cómo resolverlos antes de hacerlo.

3. Reorganiza carpetas con git mv para conservar el historial:
   - apps/identity-service      → apps/identidad
   - apps/part-request-service  → apps/negociacion
   - Api-apps/api-gateway       → apps/gateway
   Actualiza toda referencia a las rutas viejas (CI, Dockerfiles, scripts,
   package.json, settings).

4. Instala el contexto:
   - Copia _contexto/AGENTS.md, _contexto/CLAUDE.md y _contexto/docs/ a la
     raíz, reemplazando los existentes.
   - Borra docs/puertos.md, docs/distribucion-equipo.md y
     docs/arranque-equipo.md (su contenido ya está en AGENTS.md y docs/plan/).
   - Deja .github/copilot-instructions.md con solo una línea que indique leer
     AGENTS.md.
   - Actualiza .github/CODEOWNERS con los dos integrantes actuales (usa el
     usuario de GitHub de Dylan que corrige la rama fix/team-handle-dylan).
   - Actualiza README.md: qué es el proyecto, servicios y frameworks, y cómo
     levantarlo con Docker, según AGENTS.md. Máximo una página.
   - Borra la carpeta _contexto/.

5. Actualiza las skills de .agents/skills/ para que coincidan con docs/:
   - Crea spring-backend (Spring Boot 3, Java 21, Maven, JPA + Flyway con
     esquema pedidos, Spring AMQP, validación de JWT HS256, estructura en capas).
   - Crea nest-backend (NestJS, TypeORM con esquema catalogo, guard JWT, DTOs
     con class-validator, estructura en capas).
   - Actualiza express-backend, django-backend, angular-frontend,
     api-contracts-events (sobre con event_id, outbox, idempotencia, colas),
     testing-quality y code-review-security.
   - Cada skill: frontmatter con name y description, máximo ~150 líneas,
     sin repetir AGENTS.md y sin contradecir docs/.

6. Actualiza .env.example con las variables de docs/arquitectura.md: un
   usuario y contraseña de base por servicio, URLs internas por nombre de
   contenedor (http://identidad:5000, http://negociacion:4001, ...),
   JWT_SECRET y RabbitMQ.

7. No cambies la lógica de ningún servicio en esta fase.

Antes de hacer nada, muéstrame el plan y espera mi aprobación.

Al terminar: corre las pruebas existentes de identidad, negociacion y
gateway y dime el resultado real de cada una. Haz commits cortos
(chore(infra): ..., docs(...): ...) y deja la rama lista para el PR a develop.
```

## Terminado cuando

- [ ] `develop` tiene identidad, negociación y gateway en sus carpetas nuevas.
- [ ] Las pruebas existentes pasan (identidad, negociación y gateway).
- [ ] `AGENTS.md`, `CLAUDE.md`, `docs/` y skills están actualizados.
- [ ] El otro integrante revisó y aprobó el PR.
