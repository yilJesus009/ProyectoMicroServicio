"""
Django Admin: panel de administración gratuito (diferencial del proyecto).

Al cambiar el rol de un usuario desde el panel se publica
USER_ROLE_CHANGED — es el único camino de cambio de rol hoy (el contrato
no expone endpoint para eso).
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from accounts.models import SupplierProfile, SupplierProfileStatus, User
from accounts.services import supplier_service, user_service


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


@admin.register(SupplierProfile)
class SupplierProfileAdmin(admin.ModelAdmin):
    """Perfiles comerciales visibles en el panel (Fase 2 B1).

    La aprobación por API es la vía principal; aquí se agrega una acción
    para decidir varios de una vez (publica SUPPLIER_APPROVED igual que la
    API — el servicio es el único que persiste y publica).
    """

    list_display = (
        "id",
        "business_name",
        "city",
        "status",
        "user",
        "reviewed_at",
    )
    list_filter = ("status", "city")
    search_fields = ("business_name", "user__email", "city")
    # status solo lectura: el estado lo decide el servicio (API o acción),
    # nunca el formulario del panel (revisión del PR #30).
    readonly_fields = (
        "status",
        "reviewed_by",
        "reviewed_at",
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at",)
    actions = ("aprobar_seleccionados",)

    @admin.action(description="Aprobar perfiles seleccionados (solo PENDIENTE)")
    def aprobar_seleccionados(self, request, queryset):
        aprobados = 0
        for profile in queryset.filter(status=SupplierProfileStatus.PENDING):
            supplier_service.approve(
                profile,
                admin=request.user,
                correlation_id=getattr(request, "correlation_id", None),
            )
            aprobados += 1
        self.message_user(
            request,
            f"{aprobados} perfil(es) aprobado(s); el resto no estaba PENDIENTE",
        )
