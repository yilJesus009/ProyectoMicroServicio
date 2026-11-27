# Ensayo final (Fase 7) — guía de 10 pasos

> Objetivo: probar que el proyecto funciona igual que lo verá el tribunal,
> en una copia limpia, antes de tocar `main`. Este documento es la checklist
> de la Fase 7 (`docs/plan/fase-4-a-7.md`) con los comandos listos para
> copiar y pegar, más el estado real del ensayo al momento de pausarlo.

## Estado actual (pausado)

- **Pasos 1 a 6 — hechos**, sobre clon limpio de `develop` en commit
  `40cc8b7`, en
  `C:\Users\Usuario\Desktop\Tareas\WebIII\ProyectoFinal-Prueba\ProyectoMicroServicio`.
  Build sin caché, 9 contenedores `healthy`, `seed-demo.mjs`, 29/29
  comprobaciones de `e2e-flujo.mjs`, 3 corridas de
  `prueba-concurrencia-aceptar.mjs`, y las evidencias del Plan B en
  `docs/defensa/evidencias/` (ver paso 6 y la nota debajo).
- **Paso 7 — pendiente, ensayo individual.** Queda para que Dylan lo corra
  solo, con cronómetro, en una pasada antes de la defensa — no se hizo en
  esta sesión. El resto de los pasos (8, 9, 10) **no dependen de que el
  paso 7 esté hecho**.
- **Pasos 8 a 10 — no iniciados.**

### Nota — faltan las capturas de interfaz del Plan B

`docs/defensa/evidencias/` (paso 6) por ahora solo tiene la evidencia
técnica (salidas de los scripts y RabbitMQ). Las capturas de las
pantallas de la interfaz para el caso en que Docker no levante nada en
vivo (login, nueva solicitud, comparador, enviar oferta, seguimiento,
pago) se toman en la rama `fix/layout-escritorio`, después de corregir el
ancho del contenido en escritorio — tomarlas ahora las dejaría con el
layout angosto que se va a corregir.

---

## Los 10 pasos

### 1. Clon limpio (fuera del worktree de trabajo)

```powershell
cd C:\Users\Usuario\Desktop\Tareas\WebIII
git clone https://github.com/yilJesus009/ProyectoMicroServicio.git ProyectoMicroServicio-ensayo
cd ProyectoMicroServicio-ensayo
```

### 2. Seguir el README al pie de la letra

```powershell
Copy-Item .env.example .env
docker compose up --build
```

En otra terminal, cuando los 9 contenedores estén arriba:

```powershell
docker compose ps
```

Los 9 deben mostrar `healthy`. Si alguno no, revisar
`docker compose logs -f <servicio>` antes de seguir.

### 3. Sembrar datos de demo

```powershell
node scripts/seed-demo.mjs
```

Confirmar que imprime el resumen con los 3 usuarios demo
(`comprador@demo.bo`, `proveedor1@demo.bo`, `proveedor2@demo.bo`,
contraseña `Demo12345!`) y los ids de las 3 solicitudes sembradas.

### 4. Correr el flujo completo end-to-end

```powershell
node scripts/e2e-flujo.mjs
```

Debe terminar con sus 29 comprobaciones internas en `✓` (cubren los 13
pasos de negocio de `docs/flujo-principal.md`, incluidos los 3 casos
negativos y los avisos). Si algo sale `✗`, se detiene ahí mismo con el
detalle — no seguir al paso 5 sin esto en verde.

### 5. Prueba de concurrencia (la regla crítica)

```powershell
node scripts/prueba-concurrencia-aceptar.mjs
```

Salida esperada: un `200`, un `409`, una sola oferta `ACCEPTED`. Correrlo
2-3 veces para confirmar que es repetible.

### 6. Preparar capturas del Plan B (no el día de la defensa)

Guardar en `docs\defensa\evidencias\` (crear la carpeta si no existe):

- `docs\defensa\evidencias\e2e-flujo-29-29.txt` — salida completa del
  paso 4 con sus 29 comprobaciones en `✓`.
- `docs\defensa\evidencias\rabbitmq-colas.jpg` — UI de RabbitMQ
  (`http://localhost:15672`, `guest`/`guest`), pestaña Queues and Streams
  (8 colas, `notificaciones.all.dlq` en 0 mensajes).
- `docs\defensa\evidencias\rabbitmq-exchanges.jpg` — misma UI, pestaña
  Exchanges (los 4 `topic` del proyecto + `dlx`).
- `docs\defensa\evidencias\outbox-published.txt` — resultado del `SELECT`
  de `outbox_events` con `published_at` lleno (comando 3 de
  `docs/defensa/guion-demo.md`). Es salida de terminal, no una captura de
  pantalla: `.txt`, no `.png`.
- `docs\defensa\evidencias\concurrencia-200-409.txt` — salida del paso 5.
  También `.txt` por el mismo motivo.

Capturas con contenido de imagen real (RabbitMQ) se guardan como `.jpg`,
porque la herramienta de captura usada genera JPEG — nunca nombrarlas
`.png` con contenido JPEG adentro.

Pendiente (ver nota abajo): capturas de las pantallas clave de la
interfaz (login, nueva solicitud, comparador, enviar oferta, seguimiento,
pago) para el caso en que Docker no levante nada en vivo el día de la
defensa. Se toman en `fix/layout-escritorio`, después del ajuste de
ancho en escritorio.

### 7. Ensayo cronometrado, dos pasadas, con intercambio de roles

Seguir `docs/defensa/guion-demo.md` completo, con cronómetro, apuntando a
10 minutos:

- **Pasada 1:** Jesús minuto 0–4, Dylan minuto 4–9, cierre.
- **Pasada 2:** intercambiar — Dylan abre con la parte de Jesús (Docker,
  Gateway, Identidad, Angular) y Jesús cierra con la parte de Dylan
  (Negociación, Pedidos, Notificaciones, Catálogo, eventos).

Anotar en qué momento se pasaron de los 10 minutos y qué parte sobró o
faltó tiempo.

### 8. Limpiar el clon de prueba

```powershell
cd C:\Users\Usuario\Desktop\Tareas\WebIII\ProyectoMicroServicio-ensayo
docker compose down -v
cd ..
Remove-Item -Recurse -Force ProyectoMicroServicio-ensayo
```

### 9. Mergear `develop` → `main` y etiquetar `v1.0` (único paso irreversible)

Solo después de que el paso 7 salió bien **dos veces seguidas** y sin
pendientes del bloque B (`feat/rediseno-ui` ya mergeado a `develop`):

```powershell
git checkout main
git pull origin main
git merge --no-ff develop -m "release: v1.0 - entrega final RepuestosYa"
git tag -a v1.0 -m "Entrega final - 16 de noviembre de 2026"
git push origin main
git push origin v1.0
```

### 10. Pre-construir las imágenes en la máquina de la demo

El día de la defensa, antes de empezar (no en vivo):

```powershell
git checkout main
git pull origin main
docker compose build
docker compose up -d
docker compose ps   # confirmar los 9 healthy antes de que entre el tribunal
```
