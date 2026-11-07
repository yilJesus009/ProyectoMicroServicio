"""URLs raíz del Identity Service."""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    """Health check: mismo contrato que los demás servicios.

    docs/contratos-api.md: `GET /health` -> `{"status": "UP"}`. El Gateway
    lo consulta en `GET /api/v1/health` para armar el estado de todos.
    """
    return JsonResponse({"status": "UP"})


urlpatterns = [
    path("health", health),
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("accounts.urls")),
]
