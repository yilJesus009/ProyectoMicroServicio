# Guion de la demo (10 minutos)

> Requisito: `docker compose up --build` ya corrido y `node scripts/seed-demo.mjs`
> ya ejecutado **antes** de empezar la demo (no se hace en vivo). Con eso
> quedan listas las 3 solicitudes de `seed-demo.mjs`: la **abierta** (id 1,
> dos ofertas), la de pedido **pendiente de pago** (pedido 1) y la de pedido
> en **`PREPARING`** (pedido 2). Todos los comandos de abajo están probados
> contra esa misma base.

## Comandos listos para copiar

### 1. Token del comprador (PowerShell)

`curl.exe` con JSON en PowerShell es frágil (las comillas se rompen al
pasar por el parser nativo). Usar `Invoke-RestMethod`:

```powershell
$body  = @{ email = "comprador@demo.bo"; contrasena = "Demo12345!" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/login" -Method Post -ContentType "application/json" -Body $body
$token = $login.data.token
```

En Git Bash, la forma normal de `curl` funciona igual que siempre:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"comprador@demo.bo","contrasena":"Demo12345!"}' | jq -r .data.token)
```

### 2. El pago con `card_number` → 400 (la regla que la pantalla nunca deja romper)

Contra el **pedido 1** (`PENDING_PAYMENT`, de `seed-demo.mjs`):

```powershell
$payBody = '{"method":"CARD","card_number":"4111111111111111"}'
try {
  Invoke-RestMethod -Uri "http://localhost:4000/api/v1/orders/1/payment" -Method Post `
    -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" } -Body $payBody
} catch {
  $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $reader.ReadToEnd()
}
```

Respuesta real (probada):

```json
{"status":400,"msg":"Campo no permitido en el pago: 'card_number'. Solo se acepta 'method'.","data":null}
```

### 3. Una fila de `outbox_events` con `published_at`

```bash
docker compose exec postgres psql -U pedidos_user -d repuestosya -c "SELECT routing_key, published_at FROM outbox_events ORDER BY created_at DESC LIMIT 5;"
```

Salida real (probada, va a variar según lo que se haya hecho antes en la demo):

```
     routing_key      |         published_at
-----------------------+-------------------------------
 ORDER_STATUS_CHANGED | 2026-11-14 17:13:09.715661+00
 ORDER_CREATED        | 2026-11-14 17:13:09.689113+00
```

### 4. Dos aceptaciones a la vez (la prueba real de la regla crítica)

```bash
node scripts/prueba-concurrencia-aceptar.mjs
```

Salida real (probada):

```
[prueba-concurrencia] Resultado: accept(A)=200, accept(B)=409
[prueba-concurrencia] OK  — Exactamente un 200 y un 409
[prueba-concurrencia] OK  — Exactamente una oferta ACCEPTED en el comparador
[prueba-concurrencia] OK  — La otra oferta quedo REJECTED
[prueba-concurrencia] TODO PASO: la regla de una sola oferta aceptada se sostiene contra Postgres real.
```

### 5. RabbitMQ — UI

- URL: **http://localhost:15672**
- Usuario y contraseña: **`guest` / `guest`** (`.env.example`, `RABBITMQ_USER`/`RABBITMQ_PASS`).
- Pestaña **Queues and Streams**: abrir `negociacion.order_status_changed`
  (tiene 1 *consumer* activo) para mostrar una cola real consumiendo, y
  `notificaciones.all.dlq` para mostrar la cola de errores — en una corrida
  sana está en **0 mensajes**, que es justo el punto: la red de seguridad
  existe y está vacía porque nada falló.
- Pestaña **Exchanges**: `identity_events`, `part_request_events`,
  `offer_events`, `order_events` (los 4 del proyecto, todos `topic`) y `dlx`
  (`direct`, compartido por todos los `.dlq`).

## Minuto 0–4 — Jesús (Docker, Gateway, Identidad, Angular)

| Quién muestra | Usuario | Pantalla / comando | Qué mostrar | Qué decir |
|---|---|---|---|---|
| Jesús | — | terminal: `docker compose ps` | 9 contenedores `healthy` | "Todo el sistema son estos 9 contenedores: un Postgres, un RabbitMQ y 7 servicios, cada uno con su propio framework." |
| Jesús | nuevo (registra en vivo) | `http://localhost:4200/registro` | Registro de un proveedor nuevo, rol PROVEEDOR | "Registro un proveedor nuevo para mostrar la aprobación en vivo; el admin y los demás usuarios ya existen, los dejó listos un script." |
| Jesús | el proveedor nuevo | `/proveedor/perfil` | Completa nombre comercial, ciudad y categorías → queda `PENDING` | "El perfil pertenece al usuario, no es un servicio aparte — así lo decidimos en `decisiones.md` (D6)." |
| Jesús | `admin@repuestosya.com` | `/admin/proveedores` | Aprueba al proveedor nuevo | "El Gateway valida el JWT, pero cada servicio **también** lo revisa por su cuenta — si alguien entra directo por la red de Docker, igual lo para." |
| Jesús | comprador / proveedor1 / admin | menú lateral de cada uno | Tres menús distintos, cada uno con sus propias pantallas | "El frontend es una sola app Angular; el menú cambia según el rol que vino en el JWT, no por configuración aparte." |

## Minuto 4–9 — Dylan (Negociación, Pedidos, Notificaciones, Catálogo, eventos)

| Quién muestra | Usuario | Pantalla / comando | Qué mostrar | Qué decir |
|---|---|---|---|---|
| Dylan | `comprador@demo.bo` | `/comprador/solicitudes/1` | Comparador con las 2 ofertas de la solicitud 1; clic en "Aceptar" sobre la de proveedor1 | "Comparo precio y plazo de las dos ofertas. Al aceptar, la otra pasa a `REJECTED` sola — eso lo garantiza la base, no un botón que se esconde." |
| Dylan | — | (nada en pantalla todavía) | — | "La pantalla **no** muestra qué pasa si dos personas aceptan a la vez, porque solo una de las dos ofertas sigue visible como aceptable — eso lo pruebo aparte, en la terminal, con tráfico real." |
| Dylan | `comprador@demo.bo` | `/comprador/pedidos/1/pago` (pedido 1, ya en `PENDING_PAYMENT` de la demo sembrada) | Pestaña QR, botón "Ya pagué" | "Mientras se genera el pedido de la oferta que acabo de aceptar, ya tengo este otro listo para no perder tiempo esperando." |
| Dylan | — | terminal: comando 2 de arriba | `400` al mandar `card_number` | "La pantalla de pago nunca manda el número de tarjeta, pero esto prueba que aunque alguien se salte la pantalla y lo mande a mano, el backend lo rechaza." |
| Dylan | `comprador@demo.bo` | botón "Ya pagué" en la misma pantalla | Pasa a `PREPARING` con la referencia `PAY-...` | "El pago es un adaptador simulado (`SimulatedPaymentGateway`) — el día que haya uno real, solo se cambia esa pieza." |
| Dylan | `proveedor1@demo.bo` | `/proveedor/pedidos` (pedido 2, ya en `PREPARING`) | Botón de siguiente estado → `IN_TRANSIT`/`READY_FOR_PICKUP` → `DELIVERED` | "El próximo estado lo decide el tipo de entrega de la oferta — es el patrón Strategy, en `DeliveryType`." |
| Dylan | `comprador@demo.bo` | `/comprador/pedidos/{id}` | Línea de tiempo del pedido; botón "Confirmar recepción" en `DELIVERED` | "Al confirmar, el pedido pasa a `COMPLETED` **y la solicitud también** — lo hace Negociación al consumir el evento, no un segundo clic." |
| Dylan | cualquiera | campanita (barra superior) | Avisos que llegaron en cada paso anterior | "Cada paso generó su aviso dentro de la app — Notificaciones solo escucha eventos, no hay nada hardcodeado." |
| Dylan | — | terminal: comando 3 de arriba (`outbox_events`) | Una fila con `published_at` lleno | "El evento se guarda en la misma transacción que el cambio de negocio; un proceso aparte lo publica después — así nunca se pierde aunque RabbitMQ esté caído un momento." |
| Dylan | — | RabbitMQ UI (comando 5) | Exchanges y colas reales, una `.dlq` en 0 | "Cuatro exchanges, uno por tipo de evento, y cada servicio tiene su propia cola con su propia `.dlq` — ahí caería un mensaje sin `event_id` o mal formado." |
| Dylan | — | terminal: `node scripts/prueba-concurrencia-aceptar.mjs` (comando 4) | `200`/`409` en vivo, contra Postgres real | "Esto es la regla más importante del proyecto, probada con tráfico concurrente de verdad, no con un mock." |
| Dylan | cualquiera | `/comprador/solicitudes/nueva` | Tarjetas de categoría del Catálogo | "Catálogo es el servicio más simple a propósito — NestJS, sin eventos, solo lectura y administración." |

## Plan B (si algo falla en vivo)

Preparar **durante el ensayo**, no el día de la defensa:

| Si falla | Mostrar en su lugar | Archivo sugerido |
|---|---|---|
| Docker tarda en levantar o algo no queda `healthy` | Captura de `node scripts/e2e-flujo.mjs` ya corrido, con los 29 pasos en `✓` | `docs/defensa/capturas/e2e-flujo-29-29.png` (o `.txt` con la salida completa) |
| La UI de RabbitMQ no carga o el navegador se cuelga | Captura de las colas y exchanges (la salida de `rabbitmqctl list_queues`/`list_exchanges`, o un screenshot de la UI ya tomado antes) | `docs/defensa/capturas/rabbitmq-colas.png` |
| El comando de `outbox_events` no corre en vivo (typo, Docker lento) | Captura de la consulta ya corrida con una fila real con `published_at` | `docs/defensa/capturas/outbox-published.png` |
| `prueba-concurrencia-aceptar.mjs` no da tiempo a correrlo en vivo | Captura de una corrida previa con el `200`/`409` | `docs/defensa/capturas/concurrencia-200-409.png` |
| El pago o el avance de estado no responden a tiempo | Seguir con el pedido 2 (ya en `PREPARING` desde `seed-demo.mjs`) en vez de esperar el que se generó en vivo | — |

Si el plan B entra, se dice en voz alta: *"esto lo grabamos antes porque la
red del aula puede fallar; el código real está en el repositorio y lo
pueden correr ustedes mismos."*
