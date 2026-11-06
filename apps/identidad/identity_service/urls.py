"""URLs raíz del Identity Service."""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    """Health check igual que los servicios Express."""
    return JsonResponse({"service": "identity-service", "status": "OK"})


urlpatterns = [
    path("health", health),
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("accounts.urls")),
]
