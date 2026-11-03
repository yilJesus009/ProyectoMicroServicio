"""Login: contrato de docs/contratos-api.md (Identity)."""
from unittest.mock import patch

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User

LOGIN_URL = "/api/v1/auth/login"
REGISTER_URL = "/api/v1/auth/register"

CREDENTIALS = {
    "nombre": "Juan Pérez",
    "email": "juan@taller.com",
    "contrasena": "secreto123",
    "rol": "COMPRADOR",
}


class LoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        with patch("accounts.events.publisher.publish"):
            self.client.post(REGISTER_URL, CREDENTIALS, format="json")

    def test_login_exitoso_devuelve_token_y_usuario(self):
        response = self.client.post(
            LOGIN_URL,
            {"email": "juan@taller.com", "contrasena": "secreto123"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], 200)
        self.assertIn("token", body["data"])
        self.assertIn("expires_in", body["data"])
        self.assertEqual(body["data"]["expires_in"], settings.JWT_EXPIRES_IN)
        self.assertEqual(body["data"]["usuario"]["id"], 1)
        self.assertEqual(body["data"]["usuario"]["nombre"], "Juan Pérez")
        self.assertEqual(body["data"]["usuario"]["rol"], "COMPRADOR")
        # Jamás la contraseña
        self.assertNotIn("contrasena", str(body["data"]))

    def test_token_lleva_los_claims_del_contrato(self):
        """user_id, rol y email: de ellos dependen Gateway y servicios."""
        response = self.client.post(
            LOGIN_URL,
            {"email": "juan@taller.com", "contrasena": "secreto123"},
            format="json",
        )
        token = response.json()["data"]["token"]

        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        self.assertEqual(payload["user_id"], 1)
        self.assertEqual(payload["rol"], "COMPRADOR")
        self.assertEqual(payload["email"], "juan@taller.com")

    def test_password_incorrecta_devuelve_401(self):
        response = self.client.post(
            LOGIN_URL,
            {"email": "juan@taller.com", "contrasena": "otra-clave"},
            format="json",
        )

        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertEqual(body["status"], 401)
        self.assertIsNone(body["data"])

    def test_email_inexistente_devuelve_401(self):
        response = self.client.post(
            LOGIN_URL,
            {"email": "nobody@taller.com", "contrasena": "secreto123"},
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_usuario_inactivo_devuelve_401(self):
        User.objects.filter(email="juan@taller.com").update(activo=False)

        response = self.client.post(
            LOGIN_URL,
            {"email": "juan@taller.com", "contrasena": "secreto123"},
            format="json",
        )
        self.assertEqual(response.status_code, 401)
