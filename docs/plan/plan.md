# Plan de trabajo (6 al 16 de noviembre)

**Entrega:** lunes 16 de noviembre. **Días de trabajo:** del viernes 6 al
domingo 15 (10 días).

## Bloques

| Bloque | Contenido | Responsable |
|---|---|---|
| **A — Negocio** | Negociación, Pedidos, Notificaciones y Catálogo | Dylan |
| **B — Plataforma y pantallas** | Docker, Gateway, Identidad (ajustes) y Angular | Jesús |

Los dos bloques avanzan en paralelo. Se sincronizan con los contratos de
`docs/contratos-api.md` y `docs/eventos.md`, que **no se cambian sin avisar
al otro**.

## Calendario

| Fecha | Fase | Bloque A | Bloque B | Terminado cuando… |
|---|---|---|---|---|
| Vie 6 | **0. Preparar el repo** | Revisar los documentos | Integrar ramas, reorganizar carpetas, instalar el contexto | `develop` tiene todo junto y las pruebas existentes pasan |
| Sáb 7 | **1. Esqueleto en Docker** | Catálogo con categorías; Negociación al esquema; Pedidos y Notificaciones vacíos | Docker, base con esquemas, Gateway, Identidad al esquema, Angular vacío | `docker compose up` levanta todo y el login funciona desde Angular |
| Dom 8 – Lun 9 | **2. Negociación y plataforma** | Catálogo completo (primero, lo necesita Angular); solicitudes, ofertas, **aceptar oferta**; avisos | Perfil y aprobación de proveedores; pantallas de admin, proveedor y nueva solicitud | En Docker: proveedor aprobado oferta, comprador ve ofertas, llegan avisos |
| Mar 10 – Mié 11 | **3. Pedidos y pantallas del flujo** | Pedidos (pago, estados), cierre de la solicitud; avisos de pedidos | Comparador, aceptar, pago simulado, seguimiento, pedidos del proveedor | El flujo completo funciona desde Angular |
| Jue 12 | **4. Integración** | Script del flujo completo y datos de prueba | Corrección de pantallas | `scripts/e2e-flujo.mjs` pasa con Docker limpio |
| Vie 13 | **5. Calidad** | Pruebas faltantes y revisión cruzada | Errores en pantalla, detalles visuales y revisión cruzada | Checklist de `docs/flujo-principal.md` completa |
| Sáb 14 | **6. Defensa** | Guion de la demo | README de arranque | Cualquiera levanta el proyecto siguiendo el README |
| Dom 15 | **7. Ensayo y margen** | Ensayo completo | Ensayo completo | `main` etiquetado `v1.0` |
| **Lun 16** | **Presentación** | | | |

## Cómo trabajar cada fase

1. `git switch develop && git pull`
2. `git switch -c feature/<area>-<tarea>`
3. Abrir Claude Code (o Codex) en la raíz del repositorio y pegar el prompt de
   la fase y del bloque (`docs/plan/fase-N.md`).
4. **Leer el plan que propone el agente** antes de aprobarlo. Si toca algo
   fuera de la fase, pedir que lo quite.
5. Revisar el resultado: pruebas, `docker compose up --build` y probar a mano.
6. Abrir el PR hacia `develop`. **El otro integrante lo revisa** (puede pedirle
   a su agente: "revisa este PR con la skill `code-review-security`").
7. Leer `docs/defensa/fase-N-<area>.md`, que escribe el agente: es lo que
   tienes que saber explicar.

## Reglas para no perder tiempo

- Si una fase se atrasa, **se recorta alcance, no calidad del flujo
  principal.** Lo primero que se recorta: retirar ofertas, filtros, edición de
  categorías.
- Si el agente se traba más de 30 minutos en un error, se para, se pide
  ayuda al otro integrante y se describe el problema con el log exacto.
- Nadie cambia un contrato sin avisar en el grupo y actualizar `docs/` en el
  mismo PR.
