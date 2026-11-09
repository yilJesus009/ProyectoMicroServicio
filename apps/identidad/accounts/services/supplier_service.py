"""
Casos de uso del perfil comercial del proveedor (Fase 2, bloque B1).

Reglas (docs/contratos-api.md + docs/modelo-datos.md):
  - Un perfil por proveedor (OneToOne); GET devuelve 404 si no existe.
  - Cada PUT crea o actualiza y VUELVE A PENDING: quien cambia datos debe
    volver a pasar la revisión del admin.
  - Aprobar/rechazar solo sobre un perfil PENDIENTE (si no → 409).
  - Los eventos se publican DESPUÉS de persistir (transaction.on_commit),
    nunca antes; el publisher es fire-and-forget y jamás revierte el cambio
    (docs/eventos.md regla 3).
"""
import logging

from django.db import transaction
from django.utils import timezone

from accounts.events.event_names import (
    SUPPLIER_APPROVED,
    SUPPLIER_PROFILE_SUBMITTED,
    SUPPLIER_REJECTED,
    TOPIC_IDENTITY,
)
from accounts.events import publisher
from accounts.exceptions import (
    SupplierAlreadyReviewedException,
    SupplierProfileNotFoundException,
)
from accounts.models import SupplierProfile, SupplierProfileStatus

logger = logging.getLogger(__name__)


def _publish_after_commit(event_name, payload, correlation_id=None):
    """Agenda la publicación para después del COMMIT (nunca antes de
    persistir). El publisher ya traga excepciones; el try extra protege por
    si algún día se cambia (el cambio ya está guardado: no se revierte)."""

    def _emit():
        try:
            publisher.publish(
                topic=TOPIC_IDENTITY,
                event_name=event_name,
                payload=payload,
                correlation_id=correlation_id,
            )
        except Exception:  # noqa: BLE001 - fire-and-forget deliberado
            logger.warning("No se pudo publicar %s tras el commit", event_name)

    transaction.on_commit(_emit)


def get_profile(user):
    """Perfil propio. Sin perfil → SupplierProfileNotFoundException (404)."""
    try:
        return user.supplier_profile
    except SupplierProfile.DoesNotExist:
        raise SupplierProfileNotFoundException() from None


def save_profile(
    user, *, business_name, city, phone, category_ids, correlation_id=None
):
    """PUT /suppliers/me — crea o actualiza y deja el perfil en PENDING.

    @returns el perfil con su nuevo estado
    """
    with transaction.atomic():
        profile, created = SupplierProfile.objects.get_or_create(
            user=user,
            defaults={
                "business_name": business_name,
                "city": city,
                "phone": phone,
                "category_ids": category_ids,
            },
        )
        if not created:
            profile.business_name = business_name
            profile.city = city
            profile.phone = phone
            profile.category_ids = category_ids
            # Re-somete → vuelve a revisión: borra la decisión anterior.
            profile.status = SupplierProfileStatus.PENDING
            profile.rejection_reason = None
            profile.reviewed_by = None
            profile.reviewed_at = None
            profile.save()

    _publish_after_commit(
        SUPPLIER_PROFILE_SUBMITTED,
        # supplier_id = user_id del proveedor (docs/eventos.md)
        {"supplier_id": profile.user_id, "business_name": profile.business_name},
        correlation_id=correlation_id,
    )
    return profile


def list_profiles(status=None):
    """GET /admin/suppliers — perfiles ordenados por creación (nuevos
    primero). `status` ya viene validado por la vista."""
    qs = SupplierProfile.objects.select_related("user", "reviewed_by")
    if status:
        qs = qs.filter(status=status)
    return qs.order_by("-created_at")


def _require_pending(profile):
    if profile.status != SupplierProfileStatus.PENDING:
        raise SupplierAlreadyReviewedException(profile.status)


def approve(profile, *, admin, correlation_id=None):
    """POST /admin/suppliers/{id}/approve → SUPPLIER_APPROVED."""
    _require_pending(profile)
    with transaction.atomic():
        profile.status = SupplierProfileStatus.APPROVED
        profile.rejection_reason = None
        profile.reviewed_by = admin
        profile.reviewed_at = timezone.now()
        profile.save()

    _publish_after_commit(
        SUPPLIER_APPROVED,
        {
            # supplier_id = user_id del proveedor (docs/eventos.md)
            "supplier_id": profile.user_id,
            "business_name": profile.business_name,
            "city": profile.city,
            "category_ids": list(profile.category_ids),
        },
        correlation_id=correlation_id,
    )
    return profile


def reject(profile, *, reason, admin, correlation_id=None):
    """POST /admin/suppliers/{id}/reject → SUPPLIER_REJECTED."""
    _require_pending(profile)
    with transaction.atomic():
        profile.status = SupplierProfileStatus.REJECTED
        profile.rejection_reason = reason
        profile.reviewed_by = admin
        profile.reviewed_at = timezone.now()
        profile.save()

    _publish_after_commit(
        SUPPLIER_REJECTED,
        # supplier_id = user_id del proveedor (docs/eventos.md)
        {"supplier_id": profile.user_id, "reason": reason},
        correlation_id=correlation_id,
    )
    return profile
