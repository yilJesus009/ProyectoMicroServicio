# AGENTS.md — RepuestosYa

> **Fuente de verdad** para cualquier agente de IA que trabaje en este
> repositorio (Claude Code, Codex, Copilot). Léelo completo antes de tocar
> código. Si otro archivo contradice a este o a `docs/`, ganan este archivo y
> `docs/`.

---

## 1. Qué es este proyecto

Marketplace de repuestos automotrices. **Ingeniería Web III, Proyecto 04.**

Funciona como una **subasta al revés**: el comprador publica qué repuesto
necesita, los proveedores envían ofertas, el comprador compara, **acepta una
sola**, paga (pago simulado) y sigue el pedido hasta la entrega.

- **Entrega:** lunes 16 de noviembre de 2026.
- **Se presenta:** el código y el proyecto funcionando con Docker. La
  documentación es opcional.
- **Equipo:** 2 integrantes (Dylan y Jesús).

---

## 2. Flujo principal (lo que se evalúa)

```
1. Registro e inicio de sesión (comprador, proveedor, admin)
2. El proveedor completa su perfil comercial y el admin lo aprueba
3. El comprador publica una solicitud (vehículo, categoría, descripción, foto, ciudad, urgencia)
4. Los proveedores aprobados envían ofertas
5. El comprador compara y ACEPTA UNA SOLA; las demás quedan rechazadas
6. Se genera el pedido; el comprador confirma el pago simulado (QR o tarjeta)
7. El proveedor avanza el pedido: preparando → en camino / listo para retiro → entregado
8. El comprador confirma la recepción → pedido y solicitud completados
En cada paso, el afectado recibe una notificación dentro de la aplicación.
```

Si un cambio no sirve a este flujo, probablemente no deba hacerse todavía.

---

## 3. Servicios

| Servicio | Carpeta | Framework | Puerto interno | Esquema BD | Responsabilidad |
|---|---|---|---|---|---|
| **Gateway** | `apps/gateway` | Express | 4000 (expuesto) | — | Punto de entrada único, valida JWT, enruta |
| **Identidad** | `apps/identidad` | Django + DRF | 5000 | `identidad` | Usuarios, roles, JWT, perfil comercial del proveedor y su aprobación |
| **Negociación** | `apps/negociacion` | Express | 4001 | `negociacion` | Solicitudes y ofertas; **la regla de una sola oferta aceptada** |
| **Pedidos** | `apps/pedidos` | Spring Boot | 4003 | `pedidos` | Pedido, pago simulado y seguimiento hasta la entrega |
| **Catálogo** | `apps/catalogo` | NestJS | 4004 | `catalogo` | Categorías de repuestos y vehículos de cada usuario |
| **Notificaciones** | `apps/notificaciones` | Express | 4005 | `notificaciones` | Avisos dentro de la aplicación a partir de los eventos |
| **Frontend** | `apps/frontend` | Angular | 4200 (expuesto) | — | Pantallas de comprador, proveedor y admin |

Infraestructura: **un PostgreSQL** (`repuestosya`) y **RabbitMQ**.
Detalle completo en `docs/arquitectura.md`.

---

## 4. Reglas que NUNCA se rompen

1. **Una sola oferta aceptada por solicitud.** Vive en Negociación y se
   garantiza en tres capas: índice `UNIQUE` parcial en la base, verificación
   en el dominio y transacción que bloquea la solicitud (`SELECT ... FOR
   UPDATE` sobre **su propio esquema**). Nunca se garantiza solo ocultando
   botones en el frontend.
2. **Cada servicio solo toca su esquema.** Prohibido leer, escribir o hacer
   `JOIN` sobre el esquema de otro servicio. Si necesita datos ajenos, los
   pide por API o los recibe en un evento.
3. **El pedido solo nace del evento `OFFER_ACCEPTED`.** No existe un endpoint
   para crear pedidos.
4. **Todo pasa por el Gateway.** Fuera de Docker solo se exponen el Gateway
   (4000), el frontend (4200) y la UI de RabbitMQ (15672, solo para la demo).
5. **Cada servicio valida el JWT por su cuenta** (mismo `JWT_SECRET`) y
   revisa el rol. El Gateway no es el único que valida.
6. **Pago simulado:** nunca se envían ni se guardan números de tarjeta ni
   datos reales. Solo el método (`QR` o `CARD`) y una referencia simulada.
7. **Nada de secretos en el código.** Toda variable se documenta primero en
   `.env.example`.
8. **Docker siempre funcionando.** Al final de cada fase,
   `docker compose up --build` debe levantar todo y el flujo avanzado debe
   funcionar dentro de Docker.

---

## 5. Base de datos

- **Un solo PostgreSQL**, base `repuestosya`.
- **Un esquema y un usuario por servicio**: `identidad`, `negociacion`,
  `pedidos`, `catalogo`, `notificaciones`. Cada usuario solo tiene permisos
  sobre su esquema.
- Los esquemas y usuarios se crean en `infra/postgres/init.sql` al iniciar
  el contenedor.
- Cada framework crea sus tablas **solo en su esquema** (Django migrations,
  Flyway en Spring, TypeORM en Nest, Sequelize en Express).

Tablas en `docs/modelo-datos.md`.

---

## 6. Mensajería (RabbitMQ)

- Exchanges tipo `topic`, uno por agregado: `identity_events`,
  `part_request_events`, `offer_events`, `order_events`.
- Todo mensaje lleva el sobre estándar con **`event_id` único**.
- **Outbox** en Negociación y Pedidos: el evento se guarda en la misma
  transacción que el cambio y un proceso lo publica después. Así no se pierde.
- **Consumidores idempotentes:** registran el `event_id` procesado y saltan
  duplicados.

Detalle en `docs/eventos.md`.

---

## 7. Estructura de cada servicio (arquitectura limpia + DDD + CQRS)

**Express, NestJS y Spring Boot:**

```
domain/          entidades, value objects, enums, errores, interfaces de repositorio
application/     commands/ (escritura), queries/ (lectura), ports/ (interfaces hacia afuera)
infrastructure/  persistencia, mensajería (publisher, consumer, outbox), clientes HTTP, config
presentation/    controllers delgados, DTOs, middleware
```

- La dependencia apunta hacia adentro: `presentation → application → domain`.
- `domain/` no importa frameworks ni librerías de base de datos.
- Controllers delgados: validan entrada → llaman un caso de uso → responden.
- **Un caso de uso por operación.**

**Django (Identidad):** `models`, `services`, `serializers`, `views`,
`events`, con la misma idea: la regla de negocio vive en `services`, no en
las vistas.

---

## 8. Convenciones (resumen)

- Respuesta HTTP siempre con el sobre `{ "status", "msg", "data" }`.
- Rutas con versión: `/api/v1/...`, recursos en plural, `kebab-case`.
- **Código en inglés; textos de la aplicación y documentos en español.**
- Commits cortos: `tipo(área): palabras clave` → `feat(negociacion): aceptar oferta`.

Detalle en `docs/convenciones.md`.

---

## 9. Equipo y forma de trabajo

**Dos bloques de trabajo:**

| Bloque | Contenido | Responsable |
|---|---|---|
| **A — Negocio** | Negociación, Pedidos, Notificaciones y Catálogo | Dylan |
| **B — Plataforma y pantallas** | Docker, Gateway, Identidad (ajustes) y Frontend Angular | Jesús |

**Reglas de trabajo:**

1. **Una fase a la vez**, siguiendo `docs/plan/`. Cada fase trae su prompt.
2. **Primero el plan:** antes de escribir código, el agente propone qué
   archivos va a crear o modificar y espera aprobación.
3. Ramas desde `develop`: `feature/<area>-<tarea>`. PR hacia `develop`,
   revisado por el **otro** integrante.
4. **Pruebas para toda regla de negocio.** La regla de una sola oferta
   aceptada debe tener prueba explícita.
5. **No afirmes que una prueba pasó si no la ejecutaste.**
6. Al cerrar cada fase, el agente escribe `docs/defensa/fase-N-<area>.md`
   (máximo una página): qué se hizo, qué patrón se usó y cómo explicarlo en
   la defensa.
7. No agregues dependencias sin justificarlas.

---

## 10. Documentos

| Archivo | Cuándo leerlo |
|---|---|
| `docs/decisiones.md` | Para entender por qué el proyecto es así (y defenderlo) |
| `docs/arquitectura.md` | Antes de tocar la estructura, Docker o el Gateway |
| `docs/modelo-datos.md` | Antes de crear o cambiar tablas |
| `docs/contratos-api.md` | **Antes de crear o modificar un endpoint** |
| `docs/eventos.md` | Antes de publicar o consumir un evento |
| `docs/flujo-principal.md` | Para entender estados y transiciones |
| `docs/frontend.md` | Antes de tocar Angular |
| `docs/convenciones.md` | Siempre |
| `docs/plan/` | Para saber qué toca en cada fase |

Skills por tecnología en `.agents/skills/`.

---

## 11. Comandos

```bash
cp .env.example .env
docker compose up --build          # levanta todo
docker compose logs -f <servicio>  # ver logs
docker compose down -v             # apagar y borrar datos
node scripts/e2e-flujo.mjs         # recorre el flujo completo contra el Gateway
```

Pruebas por servicio: ver el README de cada carpeta en `apps/`.
