# AGENTS.md

> Este archivo es la **fuente de verdad** para cualquier agente de IA que
> trabaje en este repositorio (Claude Code, Codex, OpenCode, Copilot, etc.).
> Antes de tocar código, **léelo completo**.

---

## 1. Qué es este proyecto

**Marketplace de repuestos automotrices.** Un solicitante (propietario o
taller) publica qué repuesto necesita; los proveedores envían ofertas; el
solicitante compara, acepta **una sola** y se genera el pedido con seguimiento
hasta la entrega.

Es un proyecto académico de **Ingeniería Web 3 — Proyecto 04**.

### Flujo principal (el corazón del proyecto)

```
1. Solicitante publica una solicitud
2. Proveedores envían ofertas
3. Solicitante compara y acepta UNA SOLA oferta
4. Se genera el pedido
5. Seguimiento hasta la finalización
```

Si un cambio no sirve a este flujo, probablemente no deba hacerse todavía.

---

## 2. Stack tecnológico

| Componente | Tecnología | Puerto |
|---|---|---|
| identity-service | **Django** + DRF + SimpleJWT | `5000` |
| part-request-service | Express | `4001` |
| offer-service | Express | `4002` |
| order-service | Express | `4003` |
| catalog-vehicle-service | Express | `4004` |
| notification-service | Express | `4005` |
| api-gateway | Express | `4000` |
| frontend | **Angular** | `4200` |
| RabbitMQ | — | `5672` / `15672` |
| PostgreSQL × 6 | — | `5433`–`5438` |

**Django es obligatorio** solo para el Identity Service (requisito del docente).
El resto es Express. **Angular es obligatorio** para el frontend.

---

## 3. Documentación del proyecto

Lee estos documentos antes de tocar el código que aplique:

| Archivo | Cuándo leerlo |
|---|---|
| `docs/convenciones.md` | **Siempre.** Nombres, respuestas HTTP, commits, arquitectura. |
| `docs/arquitectura.md` | Antes de tocar la estructura de un servicio. |
| `docs/puertos.md` | Antes de tocar Docker o configurar un puerto. |
| `docs/eventos.md` | Antes de publicar o consumir un evento. |
| `docs/contratos-api.md` | **Antes de crear o modificar un endpoint.** |
| `docs/distribucion-equipo.md` | Para saber qué le pertenece a quién. |
| `docs/flujo-principal.md` | Para entender el ciclo completo de negocio. |
| `docs/arranque-equipo.md` | **Primer mensaje de arranque por integrante.** |

---

## 3.1 Quién es quién

Este repositorio lo trabajan **4 integrantes**, cada uno dueño de sus
servicios:

| Integrante | GitHub | Servicios |
|---|---|---|
| Jesús | `@yilJesus009` | `identity-service` (Django) |
| Dylan | `@dylan-alvarez` | `part-request-service`, `catalog-vehicle-service` |
| Alexis | `@alexphxmton` | `offer-service`, `order-service` |
| Latife | `@hendykg` | `api-gateway`, `notification-service`, `frontend` |

**Antes de modificar cualquier archivo, confirma con el usuario de quién es
ese servicio.** Si el usuario no te indicó cuál es su integrante, pregúntalo.

---

## 4. Reglas que NUNCA se rompen

### 4.1 La regla de una sola oferta aceptada

Es el requisito más importante del proyecto y el más fácil de romper.

> **Una solicitud puede recibir muchas ofertas, pero solo UNA puede ser
> aceptada.** Las demás quedan registradas como historial.

**Se garantiza en tres capas:**
1. Índice `UNIQUE` parcial en la base de datos (la defensa final).
2. El agregado `Offer` lanza `OfferAlreadyAcceptedException`.
3. El handler bloquea la fila con `SELECT ... FOR UPDATE` antes de validar.

**No se garantiza ocultando botones en el frontend.** El frontend solo
refleja el estado; la regla vive en el backend.

### 4.2 Persistencia independiente

- Cada microservicio tiene su **propia base PostgreSQL**.
- **Prohibido** consultar, hacer `JOIN` o migrar la base de otro servicio.
- Si necesitas datos de otro servicio, usa **HTTP** o consume su **evento**.
- **Prohibido** importar entidades de otro microservicio.

### 4.3 El pedido nace de una oferta aceptada

`order-service` **solo** crea pedidos consumiendo el evento `OFFER_ACCEPTED`.
Nunca se crea un pedido desde el frontend ni desde otro endpoint.

### 4.4 Nunca exponer un microservicio directamente

Todo pasa por el Gateway (`4000`). Los puertos `4001`–`4005` y `5000` son
internos y no se exponen al navegador.

### 4.5 El Gateway no es el único que valida el JWT

El Gateway descompone el token en headers (`X-User-Id`, `X-User-Roles`), pero
**cada microservicio también debe validar la firma** con el mismo `JWT_SECRET`.
Si alguien llega a un servicio directamente (por ejemplo desde la red Docker),
no se debe colar.

### 4.6 Nada de secretos en el código

- Toda variable de entorno se documenta primero en `.env.example`.
- **Nunca** subir un `.env` real a Git.
- **Nunca** hardcodear contraseñas, puertos ni URLs.

---

## 5. Dependencias entre capas

En los servicios Express, la dependencia apunta **hacia adentro**:

```
presentation/http  →  application  →  domain
        ↑                  ↑              ↑
   infrastructure ─────────┘              │
        └─────────────────────────────────┘
```

- `domain/` **no importa** nada de Express, Sequelize, RabbitMQ ni de las
  demás capas. Es la regla de negocio pura.
- `application/` depende de `domain/`, nunca al revés.
- Los repositorios en `domain/` son **interfaces**. La implementación real
  vive en `infrastructure/persistence/`.
- Los controllers son **delgados**: validan el DTO, llaman un caso de uso y
  devuelven la respuesta. Sin lógica de negocio.

Para el Identity Service en Django, aplica la misma idea con las carpetas
propias de Django (`models`, `services`, `serializers`, `views`, `events`).

---

## 6. Comandos útiles

```bash
# Levantar infraestructura (RabbitMQ + 6 PostgreSQL)
docker compose up -d

# Verificar que esté sano
docker compose ps

# Parar y borrar los datos
docker compose down -v

# Identity Service (Django)
cd apps/identity-service
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 5000

# Un servicio Express
cd apps/part-request-service
npm install
npm run dev          # con nodemon
npm test

# Frontend Angular
cd apps/frontend
npm install
ng serve
```

---

## 7. Reglas al generar código

1. **Lee `docs/convenciones.md`** y respeta nombres, respuestas y estructura.
2. **Lee `docs/contratos-api.md`** antes de crear o modificar un endpoint.
   Si necesitas un endpoint que no existe, propónlo ahí primero.
3. **Un caso de uso por operación.** No metas lógica de negocio en controllers.
4. **Valida las reglas de negocio en el dominio**, no en el frontend.
5. **Escribe pruebas** para toda regla de negocio nueva. La regla de una sola
   oferta aceptada debe tener prueba que la cubra.
6. **No agregues dependencias** sin justificar por qué son necesarias.
7. **No rompas lo que ya funciona.** Si necesitas refactorizar, hazlo en un
   PR separado del de la funcionalidad nueva.
8. **No afirmes que una prueba pasó si no la ejecutaste.** Sé explícito.

---

## 8. Cómo empezar una tarea

```bash
git switch develop
git pull origin develop
git switch -c feature/offer-create-offer
# ... trabajar y hacer commits
git push -u origin feature/offer-create-offer
```

Abrir un Pull Request hacia **`develop`**, no hacia `main`.

Los commits son **cortos y con palabras clave**:

```
tipo(área): palabras clave
```

```
feat(offer): validación oferta única
fix(order): transición estado inválida
test(identity): login credenciales inválidas
docs(contracts): payload ORDER_CREATED
```

Sin verbos de relleno ni frases completas: el tipo ya dice qué se hizo.
Ver `docs/convenciones.md` sección 5 para la lista de áreas válidas.

---

## 9. Convivencia del equipo

Somos 4 integrantes trabajando en un mismo monorepo.

1. **Cada servicio tiene un dueño.** No modifiques un servicio ajeno sin
   acordarlo primero con su responsable.
2. **Los contratos se definen antes de codificar.** Un cambio de contrato
   afecta a más de una persona y se discute en equipo.
3. **Nadie hace `push` a `main` ni a `develop`.** Todo pasa por PR.
4. **`develop` debe mantenerse funcional.** No es un basurero.
5. **Documenta lo que se acuerda.** Si se decidió en una charla, queda
   escrito en `docs/`.
