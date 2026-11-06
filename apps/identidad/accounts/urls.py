"""Endpoints de autenticación (docs/contratos-api.md → Identity Service)."""
from django.urls import path

from accounts import views

urlpatterns = [
    path("register", views.RegisterView.as_view(), name="register"),
    path("login", views.LoginView.as_view(), name="login"),
    path("me", views.MeView.as_view(), name="me"),
    path("verify", views.VerifyView.as_view(), name="verify"),
]
