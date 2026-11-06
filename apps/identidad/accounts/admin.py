"""
Django Admin: panel de administración gratuito (diferencial del proyecto).

Al cambiar el rol de un usuario desde el panel se publica
USER_ROLE_CHANGED — es el único camino de cambio de rol hoy (el contrato
no expone endpoint para eso).
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from accounts.models import User
from accounts.services import user_service


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "nombre", "rol", "activo", "is_staff", "created_at")
    list_filter = ("rol", "activo", "ciudad")
    search_fields = ("email", "nombre")
    ordering = ("email",)

    # USERNAME_FIELD es email; adaptamos los fieldsets del admin base.
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Datos personales", {"fields": ("nombre", "telefono", "ciudad")}),
        ("Permisos", {"fields": ("rol", "activo", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "nombre",
                    "rol",
                    "password1",
                    "password2",
                ),
            },
        ),
    )
    readonly_fields = ("created_at", "updated_at", "last_login")

    def save_model(self, request, obj, form, change):
        """Persiste y, si el rol cambió, publica USER_ROLE_CHANGED."""
        previous_role = None
        if change:
            previous_role = (
                User.objects.filter(pk=obj.pk).values_list("rol", flat=True).first()
            )

        super().save_model(request, obj, form, change)

        if previous_role and previous_role != obj.rol:
            # El publisher ya es fire-and-forget: no puede romper el admin.
            user_service.publish_role_changed(
                obj,
                previous_role,
                correlation_id=getattr(request, "correlation_id", None),
            )
