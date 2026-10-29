# Marketplace de Repuestos Automotrices

Proyecto académico de **Ingeniería Web 3 — Proyecto 04**.

Una plataforma que conecta a propietarios de vehículos y talleres que necesitan
un repuesto con proveedores capaces de ofrecerlo. El usuario publica lo que
busca, recibe distintas propuestas, compara condiciones y selecciona la
alternativa que más le convenga para generar un pedido.

---

## Flujo principal

```
Publicar solicitud  →  Recibir ofertas  →  Aceptar UNA sola  →  Pedido  →  Seguimiento
```

---

## Arquitectura

Microservicios con **API Gateway**, **DDD**, **arquitectura limpia**, **CQRS**,
**eventos** y **persistencia independiente** por servicio.

```
                              ┌──────────────────┐
              Browser ──────► │    API Gateway   │  :4000
             (Angular :4200)  │  valida JWT, iny.│
                              │  X-User-Id/Roles │
                              └────────┬─────────┘
       ┌──────────┬──────────┬─────────┼─────────┬──────────────┐
       ▼          ▼          ▼         ▼         ▼              ▼
  ┌─────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────────┐
  │identity │ │ part-  │ │ offer  │ │ order  │ │ catalog  │ │notification│
  │ Django  │ │request │ │        │ │        │ │ vehicle  │ │            │
  │  :5000  │ │ :4001  │ │ :4002  │ │ :4003  │ │  :4004   │ │   :4005    │
  └────┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └────┬─────┘ └─────┬──────┘
       ▼          ▼          ▼          ▼           ▼             ▼
    identity   part_req    offer      order      catalog     notification
       _db        _db       _db        _db         _db           _db
     (5433)     (5434)    (5435)     (5436)      (5437)        (5438)
                                    ▲
                                    │ consume OFFER_ACCEPTED
                          ┌─────────┴─────────┐
                          │     RabbitMQ      │  :5672 / :15672
                          └───────────────────┘
```

### Stack

| Componente | Tecnología |
|---|---|
| identity-service | Django + DRF + SimpleJWT |
| Servicios de negocio | Express + Sequelize |
| Comunicación asíncrona | RabbitMQ |
| Persistencia | PostgreSQL (uno por servicio) |
| Frontend | Angular |
| Infraestructura | Docker Compose |

---

## Requisitos previos

- Docker y Docker Compose
- Node.js 20+
- Python 3.11+ y `pip`
- Angular CLI

---

## Puesta en marcha

### 1. Clonar e instalar la configuración

```bash
git clone https://github.com/hendykg/ProyectoMicroServicio.git
cd ProyectoMicroServicio
cp .env.example .env
```

### 2. Levantar la infraestructura

Esto arranca RabbitMQ y las 6 bases de datos PostgreSQL.

```bash
docker compose up -d
docker compose ps
```

- RabbitMQ (UI): http://localhost:15672 — `guest` / `guest`

### 3. Arrancar los microservicios

Cada servicio en su propio terminal:

```bash
# Identity Service (Django) — puerto 5000
cd apps/identity-service
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 5000

# Part Request Service — puerto 4001
cd apps/part-request-service
npm install
npm run dev

# API Gateway — puerto 4000
cd apps/api-gateway
npm install
npm run dev
```

### 4. Frontend

```bash
cd apps/frontend
npm install
ng serve        # http://localhost:4200
```

---

## Documentación

Toda la documentación vive en [`docs/`](docs/):

| Documento | Contenido |
|---|---|
| [Convenciones](docs/convenciones.md) | Nombres, respuestas HTTP, commits, arquitectura |
| [Arquitectura](docs/arquitectura.md) | Decisiones de diseño y patrones usados |
| [Puertos](docs/puertos.md) | Asignación de puertos y bases de datos |
| [Eventos](docs/eventos.md) | Nomenclatura y payload de los eventos |
| [Contratos API](docs/contratos-api.md) | Endpoints y sus payloads |
| [Flujo principal](docs/flujo-principal.md) | El ciclo completo del negocio |
| [Distribución del equipo](docs/distribucion-equipo.md) | Quién hace qué |
| **[Arranque del equipo](docs/arranque-equipo.md)** | **Primer mensaje para tu agente de IA** |

> 🚀 **¿Recién clonaste el repo?** Ve a **[docs/arranque-equipo.md](docs/arranque-equipo.md)**
> y pega el bloque de tu integrante en tu agente de IA. Sin eso, el agente
> no sabe qué reglas seguir.

Para agentes de IA: leer [`AGENTS.md`](AGENTS.md) primero.

---

## Estructura del repositorio

```
├── apps/                       # Microservicios y frontend
│   ├── api-gateway/
│   ├── identity-service/       # Django
│   ├── part-request-service/
│   ├── offer-service/
│   ├── order-service/
│   ├── catalog-vehicle-service/
│   ├── notification-service/
│   └── frontend/               # Angular
├── packages/
│   └── shared/                 # Tipos y contratos compartidos
├── docs/                       # Toda la documentación del proyecto
├── .agents/skills/             # Skills de IA compartidas por el equipo
├── .github/                    # Plantillas de PR, CODEOWNERS, CI
├── docker-compose.yml          # RabbitMQ + 6 PostgreSQL
├── .env.example                # Variables de entorno documentadas
├── AGENTS.md                   # Reglas para agentes de IA
└── CLAUDE.md                   # Complemento específico de Claude Code
```

---

## Flujo de trabajo en equipo

Somos **4 integrantes** trabajando en un monorepo.

```
main          ← producción simulada. Protegida.
  └── develop ← integración. Protegida. Solo vía PR.
        ├── feature/identity-*
        ├── feature/part-request-*
        ├── feature/offer-*
        ├── feature/order-*
        ├── feature/catalog-*
        ├── feature/notification
        ├── feature/api-gateway
        └── feature/frontend-*
```

```bash
git switch develop
git pull origin develop
git switch -c feature/offer-create-offer
# ... trabajar
git commit -m "feat(offer): validación oferta única"
git push -u origin feature/offer-create-offer
```

Los commits son cortos y con palabras clave:

```
tipo(área): palabras clave

feat(offer): validación oferta única
fix(order): transición estado inválida
docs(api-gateway): rutas por prefijo
```

---

## Regla crítica del negocio

> **Una solicitud puede recibir múltiples ofertas, pero únicamente UNA debe
> ser aceptada para generar el pedido.** Las ofertas no seleccionadas quedan
> registradas como parte del historial de la solicitud.

Esta regla se garantiza en **tres capas**: índice `UNIQUE` parcial en la base
de datos, validación en el dominio y bloqueo de fila en la aplicación. **Nunca**
se garantiza solo ocultando botones en el frontend.

Ver [docs/flujo-principal.md](docs/flujo-principal.md).

---

## Licencia

Proyecto académico. Consultar con el equipo.
