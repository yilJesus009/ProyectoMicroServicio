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
