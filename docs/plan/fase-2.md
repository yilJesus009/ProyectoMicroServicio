# Fase 2 — Negociación y plataforma (domingo 8 y lunes 9)

**Objetivo:** dentro de Docker, un proveedor aprobado ve solicitudes y oferta,
el comprador ve las ofertas de su solicitud y puede aceptar una, y los avisos
llegan a la campanita.

---

## Bloque A — Prompt A1: Catálogo completo

```
Lee AGENTS.md, docs/contratos-api.md (Catálogo), docs/modelo-datos.md y la
skill nest-backend.

Fase 2, bloque A1 (apps/catalogo). Implementa todo lo de Catálogo en
docs/contratos-api.md:
1. Categorías para el admin: listar todas, crear, editar, activar o
   desactivar.
2. Vehículos del comprador: mine, crear, borrar.
3. Pruebas para ambos.

Muéstrame el plan antes de escribir código.
Terminado cuando, por el gateway en Docker, el admin crea y desactiva una
categoría y un comprador registra un vehículo. Al final escribe
docs/defensa/fase-2-catalogo.md.
```

## Bloque A — Prompt A2: Negociación completa (la regla crítica)

```
Lee AGENTS.md, docs/contratos-api.md (Negociación), docs/eventos.md,
docs/flujo-principal.md, docs/modelo-datos.md (esquema negociacion) y las
skills express-backend, api-contracts-events y testing-quality.

Fase 2, bloque A2 (apps/negociacion). Implementa todo lo de Negociación en
docs/contratos-api.md:
1. Solicitudes: crear con category_id validado contra Catálogo por HTTP
   interno (GET http://catalogo:4004/api/v1/categories/{id}, reenviando el
   token del usuario) y guardar category_name; copia de los datos del
   vehículo; foto opcional; mine, open (solo proveedores aprobados), detalle,
   foto y cancelar.
2. Copia local de proveedores: consume SUPPLIER_APPROVED y SUPPLIER_REJECTED
   (cola negociacion.supplier_events, idempotente con processed_events).
3. Ofertas: enviar (403 si el proveedor no está aprobado en la copia local,
   409 si ya tiene una activa, 422 si la solicitud no acepta ofertas; la
   primera oferta pasa la solicitud a RECEIVING_OFFERS), comparador ordenable,
   mis ofertas, retirar.
4. Aceptar oferta exactamente como describe docs/contratos-api.md: una
   transacción, SELECT ... FOR UPDATE sobre la solicitud, índice único parcial,
   verificación en la entidad de dominio, rechazo de las demás y eventos al
   outbox.
5. Eventos por outbox: PART_REQUEST_CREATED, PART_REQUEST_STATUS_CHANGED,
   OFFER_SUBMITTED, OFFER_ACCEPTED (con todo el payload de docs/eventos.md),
   OFFER_REJECTED.
6. Pruebas: todas las de Negociación en la lista "Casos que siempre deben
   probarse" de docs/flujo-principal.md, incluida una de dos aceptaciones
   simultáneas contra la base real (solo una gana).

Muéstrame el plan antes de escribir código. Si el plan es largo, divídelo en
dos entregas: primero solicitudes y copia de proveedores, después ofertas y
aceptar.
Terminado cuando las pruebas pasan y, dentro de Docker y por el gateway, un
proveedor aprobado oferta y el comprador acepta una oferta, dejando las demás
REJECTED y los eventos publicados. Al final escribe
docs/defensa/fase-2-negociacion.md: cómo se garantiza la regla de una sola
oferta aceptada, explicado con palabras simples.
```

## Bloque A — Prompt A3: Notificaciones de negociación

```
Lee AGENTS.md, docs/eventos.md, docs/modelo-datos.md (esquema notificaciones)
y la skill express-backend.

Fase 2, bloque A3 (apps/notificaciones):
1. Bindea la cola notificaciones.all a: SUPPLIER_PROFILE_SUBMITTED,
   SUPPLIER_APPROVED, SUPPLIER_REJECTED, PART_REQUEST_CREATED,
   OFFER_SUBMITTED, OFFER_ACCEPTED, OFFER_REJECTED. Consumo idempotente.
2. Mantén la copia local de proveedores aprobados (ciudad y categorías).
3. Crea avisos en español con title, message y link (rutas de
   docs/frontend.md):
   - SUPPLIER_PROFILE_SUBMITTED → a todos los ADMIN (role = ADMIN).
   - SUPPLIER_APPROVED / REJECTED → al proveedor.
   - PART_REQUEST_CREATED → a los proveedores aprobados de esa categoría y ciudad.
   - OFFER_SUBMITTED → al comprador.
   - OFFER_ACCEPTED → al proveedor elegido. OFFER_REJECTED → al no elegido.
4. Endpoints de docs/contratos-api.md (mine incluye los avisos dirigidos al
   rol del usuario; read y read-all).
5. Pruebas: el mismo evento dos veces crea un solo aviso; el destinatario
   correcto para cada evento.

Muéstrame el plan antes de escribir código.
Terminado cuando, en Docker, aprobar un proveedor y publicar una solicitud
generan los avisos correctos. Al final escribe
docs/defensa/fase-2-notificaciones.md.
```

---

## Bloque B — Prompt B1: Proveedores (perfil y aprobación)

```
Lee AGENTS.md, docs/contratos-api.md (Identidad), docs/eventos.md,
docs/modelo-datos.md y la skill django-backend.

Fase 2, bloque B1:
1. Identidad: modelo SupplierProfile y endpoints /suppliers/me (GET, PUT) y
   /admin/suppliers (listar por estado, aprobar, rechazar con motivo). Eventos
   SUPPLIER_PROFILE_SUBMITTED, SUPPLIER_APPROVED (con ciudad y category_ids)
   y SUPPLIER_REJECTED, publicados con transaction.on_commit. Registrar el
   perfil en el panel de Django. Pruebas.

Muéstrame el plan antes de escribir código.
Terminado cuando, por el gateway en Docker, un proveedor completa su perfil,
el admin lo aprueba y el evento SUPPLIER_APPROVED se ve en RabbitMQ. Al final
escribe docs/defensa/fase-2-identidad.md.
```

## Bloque B — Prompt B2: Pantallas de admin, proveedor y nueva solicitud

```
Lee AGENTS.md, docs/frontend.md, docs/contratos-api.md y la skill
angular-frontend.

Fase 2, bloque B2 (apps/frontend), con el patrón smart/dumb y facades:
1. Registro eligiendo COMPRADOR o PROVEEDOR.
2. Proveedor: /proveedor/perfil (formulario con categorías desde Catálogo y
   estado del perfil) y /proveedor/solicitudes (lista de solicitudes
   abiertas con filtros; aviso si el perfil no está aprobado).
3. Admin: /admin/proveedores (aprobar o rechazar con motivo) y
   /admin/categorias (lista, crear, editar, activar o desactivar).
4. Comprador: /comprador/vehiculos, /comprador/solicitudes/nueva (categorías
   en tarjetas con ícono, elegir vehículo o escribirlo, foto opcional) y
   /comprador/solicitudes.
5. Campanita en la barra superior: contador cada 15 s, lista desplegable,
   navegar al link y marcar como leído.

Muéstrame el plan antes de escribir código.
Terminado cuando todo lo anterior funciona en http://localhost:4200 contra el
backend en Docker. Al final escribe docs/defensa/fase-2-frontend.md
(incluye un ejemplo de componente smart y uno dumb).
```

## Terminado cuando (fase completa)

- [ ] En Docker y desde Angular: un proveedor se registra, completa su perfil y el admin lo aprueba.
- [ ] El comprador publica una solicitud y el proveedor la ve y oferta.
- [ ] Por API: el comprador acepta una oferta y las demás quedan `REJECTED`; una segunda aceptación da 409.
- [ ] Los avisos llegan a la campanita.
