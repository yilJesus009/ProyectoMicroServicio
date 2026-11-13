"""
Casos de uso de autenticación: registro, login y emisión de tokens.

Las vistas llaman aquí; la lógica no vive en las vistas (AGENTS.md §5).
"""
from django.contrib.auth import authenticate
from django.conf import settings
from django.db import IntegrityError, transaction
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.events.event_names import TOPIC_IDENTITY, USER_CREATED
from accounts.events import publisher
from accounts.exceptions import (
    AdminSelfRegistrationException,
    EmailAlreadyRegisteredException,
)
from accounts.models import Role, User


def create_user(
    *, nombre, email, contrasena, rol, telefono=None, ciudad=None,
    correlation_id=None,
):
    """
    Registra un usuario nuevo.

    - 400 (AdminSelfRegistrationException) si se intenta autoasignar ADMIN:
      el rol privilegiado se provisions desde el panel de administración.
    - 409 (EmailAlreadyRegisteredException) si el email ya existe, incluida
      la carrera entre dos registros simultáneos (IntegrityError de la
      restricción UNIQUE → 409, nunca 500).
    - La contraseña se hashea (bcrypt, contratos-api.md L43), jamás en claro.
    - Publica USER_CREATED con transaction.on_commit: jamás antes del
      COMMIT (docs/eventos.md regla 3); si el bus falla, el registro
      NO se rompe.

    @param correlation_id `X-Correlation-Id` de la petición: se propaga al
        evento para poder rastrear la operación entre microservicios.
    @returns usuario creado
    """
    # P1 del review: un endpoint anónimo no puede otorgarse a sí mismo
    # privilegios de administrador.
    if rol == Role.ADMIN:
        raise AdminSelfRegistrationException()

    if User.objects.filter(email=email).exists():
        raise EmailAlreadyRegisteredException(email)

    try:
        user = User.objects.create_user(
            email=email,
            password=contrasena,
            nombre=nombre,
            rol=rol,
            telefono=telefono,
            ciudad=ciudad,
        )
    except IntegrityError as exc:
        # Carrera: ambos registros pasan el chequeo previo y la base
        # rechaza uno por UNIQUE. Se traduce al 409 del contrato.
        raise EmailAlreadyRegisteredException(email) from exc

    # Mismo patrón que supplier_service: el evento sale DESPUÉS del commit,
    # nunca antes (eventos.md 3). Así, si algún día create_user corre dentro
    # de un transaction.atomic() (p. ej. ATOMIC_REQUESTS), no se anuncia un
    # usuario que aún no existe en la base.
    def _emit_user_created():
        try:
            publisher.publish(
                topic=TOPIC_IDENTITY,
                event_name=USER_CREATED,
                payload={
                    "user_id": user.id,
                    "email": user.email,
                    "role": user.rol,
                    "city": user.ciudad,
                },
                correlation_id=correlation_id,
            )
        except Exception:  # noqa: BLE001 - fire-and-forget: el registro ya
            # persistió; un fallo del bus jamás puede revertirlo (eventos.md 3).
            pass

    transaction.on_commit(_emit_user_created)
    return user


def login(*, email, contrasena):
    """
    Autentica por email + contraseña.

    @returns (user, token, expires_in) o None si las credenciales son
    incorrectas o el usuario está inactivo (401 según contrato).
    """
    user = authenticate(username=email, password=contrasena)
    if user is None or not user.is_active:
        return None

    refresh = RefreshToken.for_user(user)
    # Claims que consumen el Gateway y los demás servicios:
    #   user_id, rol, email
    refresh["user_id"] = user.id
    refresh["rol"] = user.rol
    refresh["email"] = user.email

    access = refresh.access_token
    access["user_id"] = user.id
    access["rol"] = user.rol
    access["email"] = user.email

    return user, str(access), int(settings.JWT_EXPIRES_IN)
