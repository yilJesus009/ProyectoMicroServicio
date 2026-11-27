# Defensa — Fase 2 B2: Pantallas de admin, proveedor, comprador y campanita

**Hecho por:** Jesús (Bloque B) · **Fecha:** 8 nov 2026

## Qué se hizo

| Módulo | Pieza | Archivo |
|---|---|---|
| M2.0 | 4 facades (`suppliers`, `catalogo`, `solicitudes`, `notificaciones`) + 25 pruebas | `facades/*.facade.ts` |
| M2.1 | Proveedor: `/proveedor/perfil` (formulario + categorías + estado) y `/proveedor/solicitudes` (lista con filtro y aviso si no está aprobado) | `features/proveedor/**` |
| M2.2 | Admin: `/admin/proveedores` (aprobar/rechazar con motivo, filtro) y `/admin/categorias` (CRUD y activar/desactivar en línea) | `features/admin/**` |
| M2.3 | Comprador: `/comprador/vehiculos` (CRUD), `/comprador/solicitudes` (lista) y `/comprador/solicitudes/nueva` (categorías en tarjetas, vehículo propio o manual, foto opcional con `FormData`) | `features/comprador/**` |
| M2.4 | Campanita en la barra del layout: contador cada 15 s, panel desplegable, navegar al aviso y marcar como leído | `shared/campanita/**` |
| M2.5 | Rutas de fase 2 apuntan a su componente real; las de fase 3 siguen en `PaginaVaciaComponent` | `app.routes.ts` |
| M2.6 | 116/116 pruebas en verde y `ng build --configuration production` sin avisos | — |

Componentes dumb compartidos: `shared/estado-perfil` y `shared/tarjeta-solicitud`
(los usa más de una pantalla; 7 pruebas de presentación pura).

## Patrones (y por qué)

1. **Smart/dumb**: las pantallas son *smart* — inyectan facades, guardan
   estado en `signals` y controlan el ciclo de carga/error/reintento; lo
   visual es *dumb* — solo `input()`s, sin HTTP ni estado propio. Un cambio
   de estilo o de etiqueta no toca la lógica y viceversa.
2. **Facades como única puerta a la API** (`facades/*.facade.ts`): arman la
   URL, envuelven el sobre `{status,msg,data}` y devuelven datos tipados.
   Las pantallas nunca ven `HttpClient`. `?status=PENDING` viaja dentro de
   la URL y los tests lo exigen con `expectOne(url)` completo.
3. **OnPush + signals** en todos los componentes nuevos: sin `ngZone` ni
   detección manual; el DOM se repinta con `detectChanges()` tras mutar.
4. **El backend manda**: aprobar/rechazar, estados y transiciones viven en
   los servicios; la pantalla solo refleja el `msg` del error (p. ej. 409).
   No se esconde regla con botones (AGENTS.md §4.1).
5. **Campanita "viva" pero tolerante**: `setInterval` de 15 s solo consulta
   el contador; si falla, la pantalla sigue. En pruebas `fakeAsync`, el
   `fixture.destroy()` final limpia el intervalo — zone.js drena la cola al
   terminar el test y sin eso volvería a dispararlo.

## Ejemplo smart y dumb

**Smart — `AdminProveedoresComponent`** (`features/admin/proveedores`):

```ts
private readonly suppliers = inject(SuppliersFacade);
readonly lista = signal<PerfilProveedor[]>([]);
readonly filtro = signal<EstadoPerfil | ''>('PENDING');
readonly error = signal<string | null>(null);

async aprobar(id: number): Promise<void> {
  try {
    await this.suppliers.aprobar(id);
    await this.cargar();           // relee; el backend es la fuente de verdad
  } catch (err) {
    this.error.set(mensajeDeError(err));  // p. ej. el 409 del contrato
  }
}
```

Conoce la API, el estado y los errores. Su HTML la consume y le pasa datos
a `<app-estado-perfil [estado]="…">`.

**Dumb — `TarjetaSolicitudComponent`** (`shared/tarjeta-solicitud`):

```ts
readonly solicitud = input.required<Solicitud>();   // solo esto
readonly vehiculo = computed(() => {                // presentación pura
  const s = this.solicitud();
  if (s.vehicle_label) return s.vehicle_label;
  ...
});
```

Sin `HttpClient`, sin facades, sin efectos: entra una solicitud, sale HTML.
Se prueba con `fixture.componentInstance.solicitud.set(...)` y aserciones
sobre el DOM; la usan "Solicitudes abiertas" (proveedor) y "Mis
solicitudes" (comprador) — misma tarjeta, dos pantallas.

## Cómo explicarlo en la defensa

Demo en http://localhost:4200 con Docker arriba: como admin apruebo un
proveedor (o lo rechazo escribiendo un motivo — el motivo es obligatorio)
→ como comprador publico una solicitud eligiendo categoría en tarjeta y
vehículo → **entro como proveedor y la ve en `/proveedor/solicitudes`** →
la campanita muestra el contador de avisos, la abro, hago clic en un aviso
y navega a su pantalla.

Preguntas esperables:

- *"¿Por qué hay facades si Angular ya tiene `HttpClient`?"* → un solo
  lugar conoce las URLs y el sobre `{status,msg,data}`; cambiar un contrato
  se toca en un archivo y las pantallas no se enteran.
- *"¿Por qué `input()` en la tarjeta y no la llamada a la API ahí?"* → la
  tarjeta es reutilizable y testeable sin backend: recibe datos, no los
  busca. El HTTP vive en la pantalla smart, que sí tiene contexto.
- *"¿Y si falla el contador de la campanita?"* → es informativo: el `catch`
  queda vacío a propósito y la pantalla no se rompe.
