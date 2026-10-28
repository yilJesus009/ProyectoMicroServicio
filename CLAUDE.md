# CLAUDE.md

> **Lee primero `AGENTS.md`.** Ahí está toda la arquitectura, las reglas, los
> puertos, los contratos y las convenciones del proyecto.
>
> Este archivo **no duplica** esa información. Solo añade lo específico de
> trabajar con Claude Code en este repositorio.

---

## Orden de lectura antes de tocar código

1. `AGENTS.md` — reglas del proyecto y del equipo.
2. `docs/convenciones.md` — nombres, respuestas HTTP, estructura de capas.
3. `docs/contratos-api.md` — si vas a crear o modificar un endpoint.
4. `docs/eventos.md` — si vas a publicar o consumir un evento.
5. El skill que corresponda, en `.agents/skills/`.

---

## Contexto mínimo recordatorio

- Proyecto académico: **marketplace de repuestos automotrices**.
- **4 integrantes**, monorepo compartido. Cada servicio tiene dueño.
- `identity-service` es **Django**. Todo lo demás es **Express**.
- `frontend` es **Angular**.
- RabbitMQ para eventos, PostgreSQL independiente por servicio.

---

## Reglas duras que no se negocian

1. **Una sola oferta aceptada por solicitud.** Garantizada en base de datos
   (índice `UNIQUE` parcial), en dominio y con `SELECT ... FOR UPDATE`.
   **Nunca** solo ocultando botones en el frontend.
2. **Un servicio jamás consulta la base de otro.** Ni `JOIN`, ni migración,
   ni importar su modelo. Se pide por HTTP o se consume su evento.
3. **El pedido solo nace del evento `OFFER_ACCEPTED`.** No hay endpoint que
   cree pedidos desde el frontend.
4. **Todo pasa por el Gateway (`4000`).** Los puertos de servicios son internos.
5. **Cada microservicio valida el JWT por su cuenta**, además del Gateway.
6. **Nada de secretos en el código.** Todo por variables de entorno, y el
   `.env.example` se actualiza primero.

---

## Al generar o modificar código

- Un **caso de uso por operación**. La lógica de negocio vive en `domain/` y
  `application/`, nunca en los controllers.
- Los repositorios en `domain/` son **interfaces**; la implementación va en
  `infrastructure/persistence/`.
- **Pruebas para toda regla de negocio nueva.** La regla de una sola oferta
  aceptada debe tener prueba que la cubra explícitamente.
- No agregues dependencias sin justificarlas.
- **No afirmes que una prueba pasó si no la ejecutaste.**

---

## Antes de terminar una tarea

```bash
git status                 # qué cambiaste
git diff                   # revisa tu propio diff antes de avisar
```

Verifica que:

- [ ] Respeta `docs/convenciones.md` (nombres, envelope `{status, msg, data}`).
- [ ] No toca un servicio que no sea tuyo, o se acordó con su dueño.
- [ ] Tiene pruebas para las reglas de negocio nuevas.
- [ ] No rompe el flujo principal descrito en `docs/flujo-principal.md`.
- [ ] Documenta los cambios de contrato en `docs/contratos-api.md`.

Resume al final: archivos modificados, pruebas realizadas y limitaciones.
