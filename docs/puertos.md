# Puertos y asignación de recursos

> Regla de oro: **los puertos no se improvisan**. Si alguien necesita un puerto
> nuevo, se agrega aquí primero mediante PR. Dos servicios con el mismo puerto
> rompen el `docker compose up` de todo el equipo.

## Mapa de puertos

| Servicio | Tecnología | Puerto | Base de datos | Puerto BD |
|---|---|---|---|---|
| **api-gateway** | Express | `4000` | — | — |
| **part-request-service** | Express | `4001` | `part_request_db` | `5434` |
| **offer-service** | Express | `4002` | `offer_db` | `5435` |
| **order-service** | Express | `4003` | `order_db` | `5436` |
| **catalog-vehicle-service** | Express | `4004` | `catalog_db` | `5437` |
| **notification-service** | Express | `4005` | `notification_db` | `5438` |
| **identity-service** | Django | `5000` | `identity_db` | `5433` |
| **frontend** | Angular | `4200` | — | — |
| **RabbitMQ** (AMQP) | — | `5672` | — | — |
| **RabbitMQ** (UI) | — | `15672` | — | — |

## Criterio de numeración

- **`4000`–`4099`**: servicios Node/Express. El Gateway se quedó con el `4000`
  porque es el punto de entrada y debe ser el primer puerto que se recuerde.
- **`5000`–`5099`**: servicios Django. Reservado para el futuro en caso de
  que aparezca otro servicio Python.
- **`5433`–`5499`**: instancias de PostgreSQL. El `5432` estándar queda libre
  para quien quiera correr un Postgres local sin Docker.
- **`4200`**: Angular (convención de la comunidad Angular).
- **`5672` / `15672`**: puertos oficiales de RabbitMQ. **No se pueden usar**
  para ningún microservicio.

## Reglas

1. **Prohibido** que dos microservicios configuren el mismo puerto.
2. **Prohibido** que un microservicio use `5672`, `15672`, `5433-5438` o `4200`.
3. Todo puerto se configura por **variable de entorno**, nunca hardcodeado.
4. El puerto de cada servicio está documentado también en `.env.example`.

## Verificación rápida

Antes de un PR, confirmar que la infraestructura levanta:

```bash
docker compose up -d
docker compose ps
```

Debe mostrar RabbitMQ y las 6 bases de datos en estado `healthy`.
