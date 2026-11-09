"""Permisos de rol (AGENTS.md §4.5: además del Gateway, CADA servicio
revisa el rol del JWT)."""
from rest_framework.permissions import BasePermission

from accounts.models import Role


class IsSupplier(BasePermission):
    """🏪 Solo PROVEEDOR (endpoints /suppliers/*)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "rol", None) == Role.PROVEEDOR
        )


class IsAdminRole(BasePermission):
    """🛡️ Solo ADMIN (endpoints /admin/*)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "rol", None) == Role.ADMIN
        )
