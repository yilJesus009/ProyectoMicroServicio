"""Serializadores: validan FORMA de la entrada. Las reglas de negocio
(idempotencia del email, hash de contraseña) viven en services/."""
from rest_framework import serializers

from accounts.models import Role, User


class RegisterSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    contrasena = serializers.CharField(write_only=True, max_length=128)
    telefono = serializers.CharField(max_length=20, required=False, allow_null=True)
    ciudad = serializers.CharField(max_length=80, required=False, allow_null=True)
    rol = serializers.ChoiceField(choices=Role.choices)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    contrasena = serializers.CharField(write_only=True, max_length=128)


class UserSerializer(serializers.ModelSerializer):
    """Usuario tal como lo devuelve la API (sin contraseña jamás)."""

    class Meta:
        model = User
        fields = ["id", "nombre", "email", "telefono", "ciudad", "rol"]
        read_only_fields = fields
