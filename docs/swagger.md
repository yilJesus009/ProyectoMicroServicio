# Documentación OpenAPI / Swagger

## Por qué una sola UI

Solo el Gateway expone puerto al host (AGENTS.md 4.4: fuera de Docker solo
se exponen el Gateway, el frontend y la UI de RabbitMQ). Los demás
servicios no son alcanzables desde el navegador, así que cada uno expone
**solo su spec en JSON**, pública y sin JWT, en la red interna de Docker —
sin UI propia. La única UI de Swagger es la del Gateway:

**`http://localhost:4000/docs`**

Agrega, al vuelo, la spec de los 5 servicios por la red interna y
reescribe su `servers` para que apunte al propio Gateway (no al nombre del
contenedor): "Try it out" funciona desde el navegador, pegándole al
Gateway con el JWT real. El selector de arriba a la derecha de la UI
cambia entre servicios.

## Spec de cada servicio (red interna, sin UI propia)

| Servicio | Librería | Spec interna | Agregada en |
|---|---|---|---|
| Catálogo (NestJS) | `@nestjs/swagger` | `http://catalogo:4004/docs-json` | `/docs/catalogo.json` |
| Pedidos (Spring Boot) | `springdoc-openapi-starter-webmvc-api` | `http://pedidos:4003/v3/api-docs` | `/docs/pedidos.json` |
| Identidad (Django) | `drf-spectacular` | `http://identidad:5000/api/v1/schema?format=json` | `/docs/identidad.json` |
| Negociación (Express) | `openapi.yaml` + `js-yaml` | `http://negociacion:4001/docs.json` | `/docs/negociacion.json` |
| Notificaciones (Express) | `openapi.yaml` + `js-yaml` | `http://notificaciones:4005/docs.json` | `/docs/notificaciones.json` |

Ninguna de las URLs "spec interna" es alcanzable desde fuera de la red de
Docker; solo las de la columna "Agregada en" (a través del Gateway) lo son.

## Dónde vive cada cosa

- **Catálogo**: `DocumentBuilder` + esquema Bearer en `src/main.ts`;
  `@ApiTags`/`@ApiOperation` en los controllers; `@ApiProperty` en los DTO.
  `docs` y `docs-json` excluidos del prefijo `api/v1`, igual que `health`.
- **Pedidos**: `OpenApiConfig.java` (metadatos + `@SecurityScheme`);
  `@Tag`/`@Operation` en `OrderController`; `@Schema` en los DTO de
  request. `/v3/api-docs` excluido en `JwtAuthFilter`, igual que `/health`.
- **Identidad**: `SPECTACULAR_SETTINGS` en `settings.py`;
  `@extend_schema` en cada vista de `accounts/views.py`. Spec en
  `/api/v1/schema` (`AllowAny`, el default del proyecto).
- **Negociación / Notificaciones**: `openapi.yaml` a mano en la raíz de
  cada servicio, verificado contra las rutas reales (`*.routes.js`) y
  `dto.js`. `server.js` lo carga con `js-yaml` y lo sirve en `GET
  /docs.json`, público, igual que `/health`.
- **Gateway**: `src/routes/docs.js`, montado aparte en `src/app.js` (no
  toca `src/routes/index.js`, el del enrutamiento de `/api/v1`).

## Probarlo

```bash
docker compose up -d --build --wait
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4000/docs/
curl -s http://localhost:4000/docs/catalogo.json | jq '.servers, (.paths | keys)'
curl -s http://localhost:4000/docs/pedidos.json | jq '.servers'
curl -s http://localhost:4000/docs/identidad.json | jq '.servers, (.paths | keys)'
curl -s http://localhost:4000/docs/negociacion.json | jq '.servers, (.paths | keys)'
curl -s http://localhost:4000/docs/notificaciones.json | jq '.servers, (.paths | keys)'
```

Todas responden `200` sin `Authorization`. Verificado en esta sesión contra
el stack levantado con `docker compose up -d --build --wait` (los 9
contenedores en `healthy`).
