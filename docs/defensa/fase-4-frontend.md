# Defensa — Fase 4, Recorrido de pantallas (bloque B)

**Prompt:** recorrer todas las pantallas de `docs/frontend.md` contra el
backend real en Docker, listar lo que falla o falta (pantalla / qué pasa /
qué debería pasar) y corregir en orden de importancia para el flujo
principal.

## Cómo se recorrí

Con el stack completo en Docker (9 servicios healthy, base limpia tras
`down -v && up --build`), un script corrió **exactamente las llamadas de
cada facade** de `apps/frontend/src/app/facades/` — las mismas que hace
Angular pantalla por pantalla — y verificó: status HTTP, sobre
`{status, msg, data}`, los campos que cada pantalla lee, los
ordenamientos, los flujos de error con `msg` visible y los guards de rol.
Antes: `e2e-flujo.mjs` **29/29 ✓**.

## Lista (pantalla / qué pasa / qué debería pasar)

| Pantalla | Qué pasa (verificado) | Qué debería pasar (contrato) |
|---|---|---|
| `/login` | Login ok; clave mala → 401 "Credenciales incorrectas"; redirige al panel del rol que devuelve el backend | Ídem |
| `/registro` | 201 con el usuario; email duplicado → 409 con `msg`; login automático; rol COMPRADOR/PROVEEDOR por radio | Ídem |
| `/comprador/solicitudes` | Lista con `status` traducidos; estado vacío "Aún no publicaste solicitudes" | Ídem |
| `/comprador/solicitudes/nueva` | Tarjetas de categorías activas; vehículo propio o datos manuales; multipart con `photo` → 201 | Ídem |
| `/comprador/solicitudes/:id` | Detalle ok; comparador ordenado por precio y por días; foto blob (dueño 200, proveedor aprobado 200, sin token 401, ajeno 403); `URL.revokeObjectURL` al salir | Ídem |
| "Generando tu pedido…" | `by-offer/{id}` → 404 mientras el outbox publica; luego Pedido completo; tope de 15 intentos con aviso (prueba unitaria) | Ídem |
| `/comprador/pedidos` | Lista con repuesto, proveedor, precio y estado | Ídem |
| `/comprador/pedidos/:id/pago` | Aviso "Simulación: no se realiza ningún cobro"; QR `REPUESTOSYA\|PEDIDO-12\|620.00\|BOB` con quiet zone; tarjeta precargada; body **solo** `{method}` (con `card_number` → 400); QR → `PREPARING` + referencia; doble pago → 409 | Ídem |
| `/comprador/pedidos/:id` | Línea de tiempo con historial; "Confirmar recepción" solo en `DELIVERED` (adelantado → 422 con `msg`); tras confirmar → `COMPLETED` | Ídem |
| `/comprador/vehiculos` | Alta, listado, baja; patente opcional | Ídem |
| `/proveedor/perfil` | Sin perfil → 404 y formulario; guardar → `PENDING`; editar vuelve a `PENDING`; rechazado muestra motivo | Ídem |
| `/proveedor/solicitudes` | Con perfil aprobado lista con filtros de ciudad y categoría; sin aprobar → aviso "Tu perfil todavía no está aprobado" **sin** pedir la lista (evita el 403) | Ídem |
| `/proveedor/solicitudes/:id/ofertar` | Crea ofertas; perfil REJECTED → 403 con `msg` | Ídem |
| `/proveedor/ofertas` | Estados `ACCEPTED`/`REJECTED` correctos; "Retirar oferta" solo en `SUBMITTED` | Ídem |
| `/proveedor/pedidos` | Botón siguiente según `delivery_type` (`IN_TRANSIT`/`READY_FOR_PICKUP`); salto inválido → 422; rol erróneo → 403; historial registra la transición | Ídem |
| `/admin/proveedores` | Pendientes, aprobar, rechazar con motivo, filtro de estado; doble revisión → 409 | Ídem |
| `/admin/categorias` | CRUD + toggle; inactiva desaparece de las tarjetas del comprador; validaciones → 400 | Ídem |
| Campanita | Contador cada 15 s; clic navega al `link` y marca leída; read-all → 0; todos los links son rutas reales de la app | Ídem |
| Guards (todas) | Sin token → 401 en cada servicio; rol ajeno → 403; el interceptor cierra la sesión ante un 401 | Ídem |

**Resultado: 111/111 llamadas OK en 16 pantallas + campanita.**
Dos "fallos" iniciales resultaron ser artefactos del script de medición
(esperaba `200` donde el contrato dice `201`, y leía la solicitud antes de
que el evento diferido llegara) y fueron descartados con una verificación
posterior; ninguno era del backend ni del frontend.

## Correcciones aplicadas

**Ninguna.** No apareció ningún fallo ni faltante que corregir: cada
renglón de la lista coincide con su contrato, y los comportamientos de
interfaz que no se prueban con HTTP (textos de estados, aviso de perfil
no aprobado, pestañas del pago, orden del comparador, botones
Aceptar/Retirar, recorte de la foto) están cubiertos por los **197 tests
unitarios** del frontend (`ng test`, ejecutado: 197/197 SUCCESS).

## Verificaciones extra de este recorrido

- **Rutas profundas de la SPA:** `GET http://localhost:4200/comprador/solicitudes`
  y `/proveedor/solicitudes/1/ofertar` → 200 con `index.html` (nginx con
  `try_files`): los links de la campanita no dan 404.
- **`environment.apiUrl`** apunta siempre al Gateway `localhost:4000`
  (regla 4: fuera de Docker solo se exponen Gateway y frontend).
- **Base limpia posterior** (`down -v` → `up --build` → `seed-demo` →
  `e2e-flujo` 29/29): los residuos de la medición quedaron borrados y la
  demo arranca en estado inicial.

## Limitaciones

- **Sin pase visual en navegador automatizado** (no hay herramienta de
  browser en el repo): este recorrido cubre el nivel de contrato y el de
  componentes (tests unitarios); el aspecto visual se ensaya en la fase 7
  con el guion de la demo.
- La medición se hizo contra el backend real de Docker, no con el
  navegador en vivo: si una pantalla malinterpretara un campo, esto no lo
  vería — por eso la defensa incluye la revisión de cada comportamiento de
  `docs/frontend.md` contra su componente y su prueba.
