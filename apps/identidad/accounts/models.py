"""
Modelo de usuario del Identity Service.

Identificador de login: EMAIL (no username). El rol define qué puede hacer
en los demás servicios: COMPRADOR | PROVEEDOR | ADMIN (packages/shared).
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class Role(models.TextChoices):
    COMPRADOR = "COMPRADOR", "Comprador"   # Publica solicitudes, acepta ofertas
    PROVEEDOR = "PROVEEDOR", "Proveedor"   # Envía ofertas, prepara pedidos
    ADMIN = "ADMIN", "Administrador"


class UserManager(BaseUserManager):
    """Crea usuarios por EMAIL (no hay campo username)."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("El email es obligatorio")
        user = self.model(email=self.normalize_email(email), **extra_fields)
        user.set_password(password)  # hashea; nunca en claro
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("rol", Role.ADMIN)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("El superuser debe tener is_staff=True")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("El superuser debe tener is_superuser=True")
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    nombre = models.CharField(max_length=120)
    email = models.EmailField(unique=True, db_index=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    ciudad = models.CharField(max_length=80, blank=True, null=True)
    rol = models.CharField(max_length=20, choices=Role.choices, default=Role.COMPRADOR)
    activo = models.BooleanField(default=True)
    # Necesario para iniciar sesión en Django Admin (patrón estándar de
    # AbstractBaseUser + PermissionsMixin, que no incluye is_staff).
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nombre", "rol"]

    objects = UserManager()

    @property
    def is_active(self):
        """Django autentica contra `is_active`; lo enlazamos a `activo`
        para que un usuario dado de baja no pueda iniciar sesión."""
        return self.activo

    def __str__(self):
        return f"{self.email} ({self.rol})"


class SupplierProfileStatus(models.TextChoices):
    """docs/modelo-datos.md → supplier_profiles.status."""
    PENDING = "PENDING", "Pendiente"
    APPROVED = "APPROVED", "Aprobado"
    REJECTED = "REJECTED", "Rechazado"


class SupplierProfile(models.Model):
    """Perfil comercial de un proveedor (docs/modelo-datos.md).

    Un perfil por usuario (OneToOne): el proveedor completa sus datos y el
    admin lo aprueba o rechaza. Cada PUT vuelve a PENDING (contrato
    docs/contratos-api.md): quien cambia datos debe volver a pasar revisión.
    """

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="supplier_profile"
    )
    business_name = models.CharField(max_length=120)
    city = models.CharField(max_length=80)
    phone = models.CharField(max_length=20)
    # Ids de categorías de Catálogo (esquema ajeno: números sin FK, AGENTS.md §5).
    # jsonb en Postgres y JSON en SQLite: los tests del CI corren en SQLite
    # (settings TESTING), así el mismo campo funciona en ambos.
    category_ids = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=10,
        choices=SupplierProfileStatus.choices,
        default=SupplierProfileStatus.PENDING,
    )
    rejection_reason = models.TextField(blank=True, null=True)
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.business_name} ({self.status})"
