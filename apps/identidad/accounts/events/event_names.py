"""Nombres de eventos y topics de este servicio. Fuente de verdad:
docs/eventos.md."""

# Topic agrupa los eventos de un agregado (no de un servicio)
TOPIC_IDENTITY = "identity_events"

USER_CREATED = "USER_CREATED"
USER_ROLE_CHANGED = "USER_ROLE_CHANGED"

# Perfil comercial del proveedor (docs/eventos.md mapa de eventos)
SUPPLIER_PROFILE_SUBMITTED = "SUPPLIER_PROFILE_SUBMITTED"
SUPPLIER_APPROVED = "SUPPLIER_APPROVED"
SUPPLIER_REJECTED = "SUPPLIER_REJECTED"
