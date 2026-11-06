# RepuestosYa — Marketplace de repuestos automotrices

Proyecto académico de **Ingeniería Web III, Proyecto 04**. Funciona como una
subasta al revés: el comprador publica qué repuesto necesita, los
proveedores envían ofertas, el comprador **acepta una sola**, paga (pago
simulado) y sigue el pedido hasta la entrega.

Entrega: **lunes 16 de noviembre de 2026**. Equipo: **Dylan y Jesús**.

## Flujo principal

```
Registro/login → perfil de proveedor aprobado → publicar solicitud →
recibir ofertas → aceptar UNA sola → pedido → pago simulado → seguimiento → entrega
```

## Servicios

| Servicio | Carpeta | Framework | Puerto | Esquema BD |
|---|---|---|---|---|
| Gateway | `apps/gateway` | Express | 4000 (expuesto) | — |
| Identidad | `apps/identidad` | Django + DRF | 5000 | `identidad` |
| Negociación | `apps/negociacion` | Express | 4001 | `negociacion` |
| Pedidos | `apps/pedidos` | Spring Boot | 4003 | `pedidos` |
| Catálogo | `apps/catalogo` | NestJS | 4004 | `catalogo` |
| Notificaciones | `apps/notificaciones` | Express | 4005 | `notificaciones` |
| Frontend | `apps/frontend` | Angular | 4200 (expuesto) | — |

Infraestructura: **un solo PostgreSQL** (`repuestosya`, un esquema por
servicio) y **RabbitMQ**. Todo pasa por el Gateway; los puertos de los
demás servicios son internos.

## Puesta en marcha (Docker)

```bash
git clone https://github.com/yilJesus009/ProyectoMicroServicio.git
cd ProyectoMicroServicio
cp .env.example .env
docker compose up --build
```

- Gateway: http://localhost:4000
- Frontend: http://localhost:4200
- RabbitMQ (UI, solo demo): http://localhost:15672

```bash
docker compose logs -f <servicio>   # ver logs de un servicio
docker compose down -v              # apagar y borrar datos
node scripts/e2e-flujo.mjs          # recorre el flujo completo contra el Gateway
```

## Documentación

Para agentes de IA: leer [`AGENTS.md`](AGENTS.md) primero (fuente de verdad
del proyecto). El resto de la documentación vive en [`docs/`](docs/):
arquitectura, modelo de datos, contratos de API, eventos, flujo principal,
frontend y convenciones. El plan de trabajo del 6 al 16 de noviembre está en
[`docs/plan/`](docs/plan/).

## Reglas que no se negocian

1. **Una sola oferta aceptada por solicitud** — garantizada en base de
   datos, dominio y transacción (`SELECT ... FOR UPDATE`). Nunca solo en el
   frontend.
2. **Un servicio jamás consulta la base de otro.** Se comunica por HTTP o
   eventos (RabbitMQ).
3. **El pedido solo nace del evento `OFFER_ACCEPTED`.**
4. **Todo pasa por el Gateway**; cada servicio además valida el JWT.
5. **Nada de secretos en el código**; todo en `.env.example` primero.

Detalle completo en [`AGENTS.md`](AGENTS.md).

## Licencia

Proyecto académico. Consultar con el equipo.
