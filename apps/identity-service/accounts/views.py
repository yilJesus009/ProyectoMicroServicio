"""
Vistas DELGADAS (AGENTS.md §5): validan el DTO, llaman a un servicio y
devuelven el envelope. Sin lógica de negocio aquí.
"""
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from accounts import serializers
from accounts.services import auth_service
from core.responses import success


class RegisterView(APIView):
    """POST /api/v1/auth/register — público. Crea el usuario y publica
    USER_CREATED (vía servicio)."""

    authentication_classes = []  # público: sin JWT (no interceptar el header)
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = serializers.RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = auth_service.create_user(**serializer.validated_data)

        return success(
            serializers.UserSerializer(user).data,
            msg="Usuario registrado exitosamente",
            status=201,
        )


class LoginView(APIView):
    """POST /api/v1/auth/login — público. Devuelve el JWT con los claims
    user_id, rol y email."""

    authentication_classes = []  # público: sin JWT
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = serializers.LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = auth_service.login(**serializer.validated_data)
        if result is None:
            # Credenciales incorrectas o usuario inactivo → 401 (contrato)
            from core.responses import error

            return error("Credenciales incorrectas", status=401)

        user, token, expires_in = result
        return success(
            {
                "token": token,
                "expires_in": expires_in,
                "usuario": serializers.UserSerializer(user).data,
            },
            msg="Inicio de sesión exitoso",
        )


class MeView(APIView):
    """GET /api/v1/auth/me — devuelve el usuario del token."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return success(
            serializers.UserSerializer(request.user).data,
            msg="Usuario autenticado",
        )


class VerifyView(APIView):
    """POST /api/v1/auth/verify — lo consume el Gateway.

    OJO: este endpoint responde EN PLANO (sin envelope) porque así está
    definido en docs/contratos-api.md:
        200 {"valid": true, "user_id": ..., "rol": ..., "email": ...}
        401 {"valid": false}
    """

    authentication_classes = []  # el token llega en el body/header y se
    # valida a mano con JWT_SECRET; la autenticación global de DRF
    # respondería 401 con envelope antes de llegar aquí.
    permission_classes = [AllowAny]

    def post(self, request):
        import jwt
        from django.conf import settings
        from rest_framework.response import Response

        token = ""
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
        token = token or request.data.get("token") or ""

        try:
            payload = jwt.decode(
                token, settings.JWT_SECRET, algorithms=["HS256"]
            )
            return Response(
                {
                    "valid": True,
                    "user_id": payload.get("user_id"),
                    "rol": payload.get("rol"),
                    "email": payload.get("email"),
                },
                status=200,
            )
        except jwt.ExpiredSignatureError:
            return Response({"valid": False}, status=401)
        except jwt.InvalidTokenError:
            return Response({"valid": False}, status=401)
