# Defensa — Fase 2 B1: Identidad (perfil y aprobación de proveedores)

**Hecho por:** Jesús (Bloque B) · **Fecha:** 8 nov 2026

## Qué se hizo

| Pieza | Archivo |
|---|---|
| Modelo `SupplierProfile` (OneToOne con `user`, `status`, `rejection_reason`, `reviewed_by/at`) + migración `0002` | `accounts/models.py`, `accounts/migrations/0002_supplierprofile.py` |
| Casos de uso: `get/save/list/approve/reject` con publicación vía `transaction.on_commit` | `accounts/services/supplier_service.py` |
| Endpoints: `GET/PUT /suppliers/me` (🏪), `GET /admin/suppliers?status=` · `POST …/approve` · `POST …/reject` (🛡️) | `accounts/views.py`, `accounts/supplier_urls.py` |
| Permisos de rol (`IsSupplier`, `IsAdminRole`) — cada servicio revisa el JWT, no solo el Gateway | `accounts/permissions.py` |
| Eventos `SUPPLIER_PROFILE_SUBMITTED`, `SUPPLIER_APPROVED`, `SUPPLIER_REJECTED` en `identity_events` | `accounts/events/event_names.py` |
| Excepciones de dominio → HTTP (404/409/400) en el handler global | `accounts/exceptions.py`, `core/exception_handler.py` |
| Panel de Django con listado, filtros y acción "aprobar" | `accounts/admin.py` |
| 22 pruebas nuevas (52 en total, todas en verde) | `accounts/tests/test_suppliers.py` |

## Patrones (y por qué)

1. **Vistas delgadas → servicio** (AGENTS.md §7): la vista valida la forma
   (`SupplierProfileWriteSerializer`) y delega; la regla vive en `supplier_service`.
2. **Publicar DESPUÉS del commit**: los tres eventos se agendan con
   `transaction.on_commit`; el publisher ya es fire-and-forget, así que un
   bus caído jamás revierte un cambio persistido (eventos.md regla 3 — hay
   prueba explícita).
3. **Un solo camino de vuelta a PENDING**: `PUT /suppliers/me` siempre deja
   `PENDING` y borra la decisión anterior; aprobar/rechazar solo sobre
   `PENDING` (si no → 409). Así `reviewed_by/at` nunca miente y cada
   cambio de datos vuelve a pasar revisión.
4. **Envelope y contratos**: todas las respuestas `{status,msg,data}` salvo
   `verify` (que es plano por contrato). Los códigos salen del handler
   global, no de `try/except` en las vistas.
5. **`category_ids` es `jsonb`** (decisión acordada, doc actualizado en el
   mismo PR): `int[]` no existe en SQLite, donde el CI corre los tests de
   Identidad (`settings.py` TESTING) — mismo contenido de lista, portable.

## Cómo explicarlo en la defensa

Demo en vivo (por el Gateway, 4000): registro un proveedor → `PUT
/suppliers/me` → aparece en `GET /admin/suppliers?status=PENDING` → el admin
aprueba → el estado pasa a `APPROVED` con `reviewed_by` → **en RabbitMQ se
ve el mensaje `SUPPLIER_APPROVED`** con `{supplier_id, business_name, city,
category_ids}`. Si el proveedor vuelve a enviar su perfil, vuelve a
`PENDING`: es el contrato, no un bug.

Pregunta esperable: *"¿por qué 409 al aprobar dos veces?"* → porque la
fuente de verdad del ciclo de vida es `status`; sin esa guarda, dos
aprobaciones simultáneas publicarían dos eventos contradictorios para los
consumidores (Negociación y Notificaciones).
