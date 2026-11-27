# Seed de demo

`scripts/seed-demo.mjs` deja datos listos para la presentación, llamando a
la API a través del Gateway (nunca directo a la base: las contraseñas de
Identidad van hasheadas). Es **idempotente**: correrlo varias veces no
duplica usuarios, perfiles, vehículos ni solicitudes — si algo ya existe en
el estado correcto, lo reutiliza.

## Uso

```bash
docker compose up -d --build --wait
cp .env.example .env   # si todavía no existe, con ADMIN_EMAIL / ADMIN_PASSWORD reales
node scripts/seed-demo.mjs
```

Variable opcional: `API_BASE` (por defecto `http://localhost:4000/api/v1`).

## Qué deja sembrado

El bloque original (no se mueve de lugar: `docs/defensa/guion-demo.md` ya
asume estos ids tal cual) crea, en este orden:

1. `comprador@demo.bo`, `proveedor1@demo.bo` y `proveedor2@demo.bo`.
2. Solicitud **id 1**, abierta, con 2 ofertas (comparador listo para aceptar).
3. Solicitud **id 2**, con oferta aceptada y **pedido 1** en `PENDING_PAYMENT`.
4. Solicitud **id 3**, con oferta aceptada y **pedido 2** pagado (`PREPARING`).

La extensión de esta sesión agrega, después:

5. `proveedor3@demo.bo` — **AutoPartes Lara**, en La Paz.
6. `comprador2@demo.bo` — con un Suzuki Swift 2020.
7. Solicitud **sin ofertas** (categoría Motor).
8. Solicitud con **3 ofertas** (categoría Suspensión), de los tres proveedores.
9. Solicitud aceptada con pedido **pagado y avanzado hasta "Listo para
   retiro"** (`READY_FOR_PICKUP`): oferta con `delivery_type: PICKUP`
   (categoría Sistema eléctrico).
10. Solicitud aceptada con pedido **entregado** (`DELIVERED`, sin confirmar
    recepción): `delivery_type: DELIVERY` (categoría Carrocería).

Todos los usuarios de demo comparten la contraseña `Demo12345!`. El admin usa
`ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env`.

## Categorías usadas

El seed **no crea ni modifica categorías**: usa, por su nombre exacto, las
que Catálogo ya precarga al iniciar (`SeedCategoriesService`, 10 fijas).
Las solicitudes nuevas de esta sesión se concentran en las que tienen ícono
propio en el frontend: Frenos, Motor, Suspensión, Sistema eléctrico,
Carrocería y Llantas y ruedas.

> **Nota:** `apps/frontend/src/app/shared/iconos-categoria.ts` normaliza el
> nombre de la categoría y espera exactamente `frenos`, `motor`,
> `suspension`, `electrico`, `carroceria` o `neumaticos`. Dos de los
> nombres reales de Catálogo no calzan con esa lista — "Sistema eléctrico"
> (no "Eléctrico") y "Llantas y ruedas" (no "Neumáticos") — así que esas dos
> categorías caen hoy al ícono genérico `build` en vez de a su PNG propio.
> Es un desajuste del lado del frontend, no de datos; se corrige en la rama
> del rediseño. Esta sesión solo lo deja anotado, sin renombrar categorías.

## Reset completo

```bash
docker compose down -v
docker compose up -d --build --wait
node scripts/seed-demo.mjs
```

## Verificación hecha en esta sesión

- `node scripts/seed-demo.mjs` corrido dos veces seguidas: mismos ids,
  misma referencia de pago, nada duplicado.
- `node scripts/e2e-flujo.mjs` con el seed ya cargado: 29/29 (usa correos
  con timestamp, no choca con los `@demo.bo` del seed).
