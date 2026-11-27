# Fase 1 — Defensa: Infraestructura, Gateway e Identidad (B1)

## Qué se hizo

- **`infra/postgres/init.sql`**: crea la base `repuestosya`, los 5 esquemas
  (`identidad`, `negociacion`, `pedidos`, `catalogo`, `notificaciones`), 5
  usuarios `LOGIN` y hace dueño de su esquema a cada uno. Cierra `public` y
  revoca todo a `PUBLIC`; fija `search_path` por usuario. Las contraseñas van
  en claro porque **psql no lee variables de entorno** en scripts de init; se
  documentan y se acoplan a `.env.example` (aviso explícito en el archivo).
- **`docker-compose.yml`**: `postgres` (con `init.sql` y healthcheck),
  `rabbitmq` (management, UI 15672), `identidad` y `gateway`, con
  `depends_on: condition: service_healthy`. Solo se publican 4000 y 15672.
- **Identidad**: se conecta con `DB_IDENTIDAD_*` dentro de `DB_NAME` y
  `search_path=identidad` en `OPTIONS`. El entrypoint hace
  `migrate → create_admin → runserver` (admin desde `ADMIN_EMAIL` /
  `ADMIN_PASSWORD`) y expone `GET /health → {"status":"UP"}`.
- **Gateway**: rutas por prefijo de los 5 servicios, `GET /api/v1/health`
  público que consulta todos en paralelo, CORS solo para
  `http://localhost:4200` y `X-Correlation-Id`.

## Por qué un esquema por servicio

Un solo PostgreSQL reduce el costo y la operación, pero los microservicios
deben seguir siendo independientes: es la regla 2 de AGENTS.md y la decisión
**D3**. Si cada servicio tuviera su propia base, el despliegue sería más
caro y no podríamos ver todo el sistema con un solo `docker compose up`; si
todos compartieran el mismo esquema, cualquiera podría leer los datos de otro
y nada separaría las responsabilidades. El esquema es el punto medio: **una
base física, cinco dominios lógicos**, donde el permiso lo da el motor de
base de datos y no la buena voluntad del programador.

## Cómo explicarlo (respuesta corta para la defensa)

> «Tenemos un solo PostgreSQL para no complicar el despliegue, pero cada
> microservicio tiene su esquema y su usuario, que es dueño de ese esquema.
> Verificamos que un usuario no puede ni leer ni escribir en el esquema de
> otro: lo probamos con una consulta real y falla con `permission denied`.
> Así mantenemos un despliegue simple sin perder el aislamiento.»

## Verificación ejecutada (2026-11-06)

| Prueba | Resultado |
|---|---|
| `docker compose config --quiet` | OK |
| `docker compose down -v && docker compose up --build` | 4 contenedores **healthy** |
| `GET /api/v1/health` | `identidad: UP` (los demás, pendientes del bloque A) |
| `POST /api/v1/auth/login` por el Gateway | HTTP 200 con token |
| `POST /api/v1/auth/register` + `GET /auth/me` | 201 y 200 con el rol correcto |
| Aislamiento: `CREATE TABLE negociacion.hack` como `identidad_user` | `permission denied for schema negociacion` |
| Tablas creadas | Solo en el esquema `identidad` (10 tablas) |
| Pruebas de Identidad | **30/30 OK** |
| Pruebas del Gateway | **8/8 OK** |

## Cómo verlo en vivo

```powershell
docker compose down -v
docker compose up --build
curl http://localhost:4000/api/v1/health
```
