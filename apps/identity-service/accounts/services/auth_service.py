"""
Casos de uso de autenticación: registro, login y emisión de tokens.

Las vistas llaman aquí; la lógica no vive en las vistas (AGENTS.md §5).
"""
from datetime import timedelta

from django.contrib.auth import authenticate
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.events.event_names import TOPIC_IDENTITY, USER_CREATED
from accounts.events import publisher
from accounts.exceptions import EmailAlreadyRegisteredException
from accounts.models import User


def create_user(*, nombre, email, contrasena, rol, telefono=None, ciudad=None):
    """
    Registra un usuario nuevo.

    - 409 (EmailAlreadyRegisteredException) si el email ya existe.
    - La contraseña se hashea (set_password), nunca se guarda en claro.
    - Publica USER_CREATED tras persistir; si el bus falla, el registro
      NO se rompe (docs/eventos.md regla 3).

    @returns usuario creado
    """
    if User.objects.filter(email=email).exists():
        raise EmailAlreadyRegisteredException(email)

    user = User.objects.create_user(
        email=email,
        password=contrasena,
        nombre=nombre,
        rol=rol,
        telefono=telefono,
        ciudad=ciudad,
    )

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
            correlation_id=getattr(user, "_correlation_id", None),
        )
    except Exception:  # noqa: BLE001 - fire-and-forget: el registro ya
        # persistió; un fallo del bus jamás puede revertirlo (eventos.md 3).
        pass
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
