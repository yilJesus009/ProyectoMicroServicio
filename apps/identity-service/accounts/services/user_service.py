"""
Casos de uso sobre usuarios (distintos del login).

`change_role` es el único camino para cambiar un rol: valida, persiste y
publica USER_ROLE_CHANGED. Lo usa el Django Admin; si más adelante se
expone un endpoint, se reutiliza tal cual.
"""
from accounts.events.event_names import TOPIC_IDENTITY, USER_ROLE_CHANGED
from accounts.events import publisher
from accounts.exceptions import InvalidRoleException
from accounts.models import Role, User


def publish_role_changed(user: User, previous_role: str) -> None:
    """Publica USER_ROLE_CHANGED (fire-and-forget: jamás lanza)."""
    try:
        publisher.publish(
            topic=TOPIC_IDENTITY,
            event_name=USER_ROLE_CHANGED,
            payload={
                "user_id": user.id,
                "previous_role": previous_role,
                "new_role": user.rol,
            },
            correlation_id=getattr(user, "_correlation_id", None),
        )
    except Exception:  # noqa: BLE001 - el cambio de rol ya persistió;
        # el bus caído no puede invalidarlo (eventos.md regla 3).
        pass


def change_role(user: User, new_role: str) -> User:
    if new_role not in Role.values:
        raise InvalidRoleException(new_role)

    previous_role = user.rol
    if previous_role == new_role:
        return user

    user.rol = new_role
    user.save(update_fields=["rol", "updated_at"])

    publish_role_changed(user, previous_role)
    return user
