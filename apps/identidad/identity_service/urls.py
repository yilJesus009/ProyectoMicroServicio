"""URLs raíz del Identity Service."""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView


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
    # Perfil comercial del proveedor y aprobación (Fase 2 B1)
    path("api/v1/", include("accounts.supplier_urls")),
    # Spec OpenAPI (sin UI propia, ver settings.py): público, igual que
    # /health; AllowAny es el default de DRF en este proyecto.
    path("api/v1/schema", SpectacularAPIView.as_view(), name="schema"),
]
