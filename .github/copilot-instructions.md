# Instrucciones del proyecto

> Este archivo lo carga **GitHub Copilot** automáticamente. La fuente de
> verdad es [`AGENTS.md`](../AGENTS.md); léelo completo antes de generar
> código. Esta guía solo resume lo esencial.

## Qué es este proyecto

Marketplace de repuestos automotrices: se publica una solicitud, los
proveedores envían ofertas, se acepta **una sola** y se genera el pedido.

- 4 integrantes, monorepo compartido. Cada servicio tiene dueño
  (ver `docs/distribucion-equipo.md`).
- `identity-service` es **Django**; todo lo demás es **Express**;
  `frontend` es **Angular**.
- Antes de empezar: `docs/arranque-equipo.md` (mensaje de arranque por
  integrante).

## Reglas que nunca se rompen

1. **Una sola oferta aceptada por solicitud** — garantizada en la base de
   datos, el dominio y la transacción. No en el frontend.
2. **Persistencia independiente**: cada servicio tiene su propia PostgreSQL.
   Nunca hacer `JOIN` ni importar entidades de otro servicio. Comunicación
   por HTTP o eventos (RabbitMQ).
3. `order-service` solo crea pedidos consumiendo `OFFER_ACCEPTED`.
4. Todo pasa por el Gateway (`4000`); cada servicio además valida el JWT.
5. Nada de secretos en el código: todo en `.env.example` primero.

## Antes de generar código

- Lee `docs/convenciones.md` (nombres, respuestas `{status,msg,data}`,
  estructura de 4 capas) y `docs/contratos-api.md` (endpoints).
- Un caso de uso por operación; controllers delgados; reglas de negocio en
  el dominio.
- Escribe pruebas para toda regla de negocio nueva.
- Commits cortos: `tipo(área): palabras clave`
  → `feat(offer): validación oferta única`.
