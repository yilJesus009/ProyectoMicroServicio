# Ensayo final (Fase 7) — guía de 10 pasos

> Objetivo: probar que el proyecto funciona igual que lo verá el tribunal,
> en una copia limpia, antes de tocar `main`. Este documento es la checklist
> de la Fase 7 (`docs/plan/fase-4-a-7.md`) con los comandos listos para
> copiar y pegar, más el estado real del ensayo al momento de pausarlo.

## Estado actual (pausado)

- **Paso 1 — hecho.** Clonado en
  `C:\Users\Usuario\Desktop\Tareas\WebIII\ProyectoFinal-Prueba\ProyectoMicroServicio`
  (nota: el repo quedó en una subcarpeta `ProyectoMicroServicio` porque el
  clon no se hizo con un nombre de carpeta destino explícito — es la ruta
  real a usar para retomar, no la del paso 1 sugerido abajo).
- **Paso 2 — en curso.** Docker Desktop estaba iniciando; `docker compose up
  --build` corriendo en foreground (sin `-d`) mostraba los healthchecks de
  `marketplace-frontend` y `marketplace-identidad` respondiendo 200 de forma
  repetida, lo que indica stack sano. **Falta confirmar explícitamente** con
  `docker compose ps` que los 9 contenedores están `healthy`, y **todavía no
  se corrió** `node scripts/seed-demo.mjs`.
- **Pasos 3 a 10 — no iniciados.**

### Nota importante — reinicio del ensayo

Cuando se mergee `feat/rediseno-ui` a `develop`, **este ensayo se reinicia
desde el paso 1** (clon limpio nuevo), porque el objetivo es probar el
código que realmente se va a presentar, no una versión previa al rediseño.
No tocar `main` ni el tag `v1.0` hasta repetir el ensayo completo sobre el
`develop` ya actualizado.

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

Guardar en `docs\defensa\capturas\` (crear la carpeta si no existe):

- `docs\defensa\capturas\e2e-flujo-29-29.png` (o `.txt`) — salida completa
  del paso 4 con sus 29 comprobaciones en `✓`.
- `docs\defensa\capturas\rabbitmq-colas.png` — UI de RabbitMQ
  (`http://localhost:15672`, `guest`/`guest`), pestañas Queues y Exchanges.
- `docs\defensa\capturas\outbox-published.png` — resultado del `SELECT` de
  `outbox_events` con `published_at` lleno (comando 3 de
  `docs/defensa/guion-demo.md`).
- `docs\defensa\capturas\concurrencia-200-409.png` — salida del paso 5.

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
