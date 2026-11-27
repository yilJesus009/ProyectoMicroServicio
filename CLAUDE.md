@AGENTS.md

# Claude Code en este repositorio

Las reglas del proyecto están en `AGENTS.md` (importado arriba). Este archivo
solo agrega cómo trabajar con Claude Code.

## Cómo trabajar

1. **Una fase a la vez.** El integrante te indica el archivo de la fase en
   `docs/plan/` y el bloque (A o B). No adelantes trabajo de otras fases.
2. **Empieza en modo plan.** Lee los documentos que pide la fase, propón un
   plan corto (archivos a crear o modificar y por qué) y **espera la
   aprobación** antes de escribir código.
3. **Lee la skill que corresponda** en `.agents/skills/` según la tecnología:
   - Express: `express-backend`
   - NestJS: `nest-backend`
   - Spring Boot: `spring-backend`
   - Django: `django-backend`
   - Angular: `angular-frontend`
   - Eventos: `api-contracts-events`
   - Pruebas: `testing-quality`
   - Revisión: `code-review-security`
4. **No toques servicios fuera de la fase** salvo que el integrante lo pida.

## Antes de dar una fase por terminada

```bash
git status && git diff          # revisa tu propio cambio
docker compose up --build       # todo debe levantar
```

- [ ] Pruebas del servicio ejecutadas (di cuáles y su resultado real).
- [ ] El flujo avanzado funciona dentro de Docker, pasando por el Gateway.
- [ ] Contratos nuevos o cambiados documentados en `docs/`.
- [ ] Escrito `docs/defensa/fase-N-<area>.md`.

Resume al final: archivos modificados, pruebas ejecutadas y limitaciones.
