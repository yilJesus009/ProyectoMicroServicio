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

## Scripts de prueba

Ambos scripts son Node 20 puro (sin dependencias) y solo hablan con el
Gateway (`http://localhost:4000/api/v1`); nunca tocan la base de datos ni
RabbitMQ directamente. Requieren Docker arriba y un `.env` real con
`ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### `node scripts/e2e-flujo.mjs`

Recorre los 13 pasos de `docs/flujo-principal.md` de punta a punta con
usuarios nuevos (emails con marca de tiempo, por lo que se puede correr
varias veces seguidas sin chocar). Imprime `✓`/`✗` por paso y, si algo
falla, se detiene en ese paso con el detalle del error (código 1).

Incluye los casos negativos clave: aceptar una segunda oferta (**409**),
pagar un pedido ya pagado (**409**) y enviar `card_number` en el pago
(**400**). También verifica que el destinatario correcto reciba el aviso
esperado (`type` del aviso) en cada paso con evento asíncrono.

### `node scripts/seed-demo.mjs`

Deja listos para la demo (contraseña `Demo12345!` para los tres usuarios):

- `comprador@demo.bo`, `proveedor1@demo.bo`, `proveedor2@demo.bo` —
  proveedores ya aprobados, en Santa Cruz, con varias categorías.
- Un vehículo del comprador.
- **Tres solicitudes** distintas, para no tener que recorrer el flujo a
  mano en cada pantalla:
  1. Una **abierta** con dos ofertas, lista para aceptar.
  2. Una **ya aceptada**, con su pedido en `PENDING_PAYMENT` (para probar
     la pantalla de pago).
  3. Una **ya aceptada y pagada**, con el pedido en `PREPARING` (para
     probar seguimiento y pantallas del proveedor).

Es reejecutable: si el usuario, el perfil o una solicitud en el estado
correcto ya existen, los reutiliza en vez de duplicarlos. Al terminar
imprime un resumen con los usuarios, la contraseña y los ids creados.

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
