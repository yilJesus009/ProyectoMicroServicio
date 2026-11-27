"""Endpoints del perfil comercial de proveedores (docs/contratos-api.md →
Identity Service). Se montan en `api/v1/` (identity_service/urls.py)."""
from django.urls import path

from accounts import views

urlpatterns = [
    path("suppliers/me", views.SupplierMeView.as_view(), name="supplier-me"),
    path(
        "admin/suppliers",
        views.AdminSuppliersView.as_view(),
        name="admin-suppliers",
    ),
    path(
        "admin/suppliers/<int:profile_id>/approve",
        views.AdminSupplierApproveView.as_view(),
        name="admin-supplier-approve",
    ),
    path(
        "admin/suppliers/<int:profile_id>/reject",
        views.AdminSupplierRejectView.as_view(),
        name="admin-supplier-reject",
    ),
]
