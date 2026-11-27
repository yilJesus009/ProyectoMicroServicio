"""Errores de dominio (skill django-backend). Se traducen a HTTP en
core/exception_handler.py, nunca en las vistas."""


class EmailAlreadyRegisteredException(Exception):
    def __init__(self, email):
        super().__init__(f"El correo {email} ya se encuentra registrado")


class InvalidRoleException(Exception):
    def __init__(self, rol):
        super().__init__(
            f"Rol no válido: {rol}. Use COMPRADOR, PROVEEDOR o ADMIN"
        )


class AdminSelfRegistrationException(Exception):
    """P1 del review: el rol ADMIN no se autoasigna en el registro público.

    ADMIN solo se provisions desde el panel de administración (Django Admin
    o un proceso interno), nunca desde un endpoint anónimo.
    """

    def __init__(self):
        super().__init__(
            "El rol ADMIN no puede autoasignarse en el registro público. "
            "Use COMPRADOR o PROVEEDOR; el ADMIN se crea desde el panel de "
            "administración"
        )


class SupplierProfileNotFoundException(Exception):
    """GET /suppliers/me sin perfil → 404 (contrato)."""

    def __init__(self):
        super().__init__(
            "El proveedor no tiene un perfil comercial. "
            "Complete su perfil con PUT /suppliers/me"
        )


class SupplierAlreadyReviewedException(Exception):
    """Aprobar/rechazar un perfil que no está PENDING → 409.

    El único camino de vuelta a PENDING es un nuevo PUT del proveedor
    (contrato: cada PUT vuelve a PENDIENTE).
    """

    def __init__(self, status_actual):
        super().__init__(
            f"El perfil ya fue revisado (estado actual: {status_actual}). "
            "Solo se aprueba o rechaza un perfil PENDIENTE"
        )


class InvalidSupplierStatusException(Exception):
    """Filtro ?status= inválido en GET /admin/suppliers → 400."""

    def __init__(self, valor):
        super().__init__(
            f"Estado no válido: {valor}. Use PENDING, APPROVED o REJECTED"
        )
