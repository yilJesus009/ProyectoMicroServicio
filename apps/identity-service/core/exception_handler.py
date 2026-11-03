"""
Handler global de excepciones.

Traduce TODAS las excepciones al envelope {status, msg, data}. Las vistas
no hacen try/except: lanzan y el handler responde.
"""
import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    NotAuthenticated,
    PermissionDenied,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from accounts.exceptions import (
    AdminSelfRegistrationException,
    EmailAlreadyRegisteredException,
    InvalidRoleException,
)

logger = logging.getLogger(__name__)

# Errores de dominio → HTTP (AGENTS.md / skill django-backend)
DOMAIN_EXCEPTIONS = {
    EmailAlreadyRegisteredException: status.HTTP_409_CONFLICT,
    InvalidRoleException: status.HTTP_400_BAD_REQUEST,
    AdminSelfRegistrationException: status.HTTP_400_BAD_REQUEST,
}


def api_exception_handler(exc, context):
    # 1. Errores de dominio propios
    for exc_type, http_status in DOMAIN_EXCEPTIONS.items():
        if isinstance(exc, exc_type):
            return Response(
                {"status": http_status, "msg": str(exc), "data": None},
                status=http_status,
            )

    # 2. Validación de serializers (DRF ValidationError)
    if isinstance(exc, ValidationError):
        return Response(
            {
                "status": 400,
                "msg": "Datos inválidos",
                "data": {"errors": exc.detail},
            },
            status=400,
        )

    # 3. Autenticación / autorización de DRF
    if isinstance(exc, NotAuthenticated):
        return Response(
            {"status": 401, "msg": "Token no proporcionado o inválido", "data": None},
            status=401,
        )
    if isinstance(exc, PermissionDenied):
        return Response(
            {"status": 403, "msg": "No tienes permiso para esta operación", "data": None},
            status=403,
        )

    # 4. Django (404 de rutas, etc.)
    if isinstance(exc, Http404):
        return Response(
            {"status": 404, "msg": "Recurso no encontrado", "data": None}, status=404
        )
    if isinstance(exc, DjangoPermissionDenied):
        return Response(
            {"status": 403, "msg": "No tienes permiso para esta operación", "data": None},
            status=403,
        )

    # 5. Cualquier APIException conocida de DRF
    if isinstance(exc, APIException):
        code = getattr(exc, "status_code", 500)
        return Response(
            {"status": code, "msg": str(exc), "data": None}, status=code
        )

    # 6. Inesperado: log completo aquí, mensaje genérico al cliente
    logger.exception("Error no controlado: %s", exc, exc_info=exc)
    return Response(
        {"status": 500, "msg": "Error interno del servidor", "data": None}, status=500
    )
