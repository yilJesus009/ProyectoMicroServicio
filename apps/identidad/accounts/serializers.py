"""Serializadores: validan FORMA de la entrada. Las reglas de negocio
(idempotencia del email, hash de contraseña) viven en services/."""
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from accounts.models import Role, SupplierProfile, User


class RegisterSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    contrasena = serializers.CharField(write_only=True, max_length=128)
    telefono = serializers.CharField(max_length=20, required=False, allow_null=True)
    ciudad = serializers.CharField(max_length=80, required=False, allow_null=True)
    rol = serializers.ChoiceField(choices=Role.choices)

    def validate_contrasena(self, value):
        """Aplica AUTH_PASSWORD_VALIDATORS.

        Estaban configurados en settings pero nadie los llamaba:
        `set_password()` solo hashea, no valida (hallazgo P2 del review).
        """
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    contrasena = serializers.CharField(write_only=True, max_length=128)


class UserSerializer(serializers.ModelSerializer):
    """Usuario tal como lo devuelve la API (sin contraseña jamás)."""

    class Meta:
        model = User
        fields = ["id", "nombre", "email", "telefono", "ciudad", "rol"]
        read_only_fields = fields


class SupplierProfileWriteSerializer(serializers.Serializer):
    """PUT /suppliers/me — forma del cuerpo (contrato: los cuatro campos)."""

    business_name = serializers.CharField(max_length=120)
    city = serializers.CharField(max_length=80)
    phone = serializers.CharField(max_length=20)
    category_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
        help_text="Ids de categorías de Catálogo que atiende",
    )


class SupplierProfileSerializer(serializers.ModelSerializer):
    """Perfil comercial tal como lo devuelve la API (lectura)."""

    # La FK `user` se expone como su llave (attname del modelo)
    user_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = SupplierProfile
        fields = [
            "id",
            "user_id",
            "business_name",
            "city",
            "phone",
            "category_ids",
            "status",
            "rejection_reason",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class SupplierRejectSerializer(serializers.Serializer):
    """POST /admin/suppliers/{id}/reject — body: reason."""

    reason = serializers.CharField(max_length=500, allow_blank=False)
