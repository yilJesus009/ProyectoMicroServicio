"""GET /me y POST /verify — contrato de docs/contratos-api.md (Identity).

OJO: `verify` responde EN PLANO (sin envelope) por contrato; el resto del
servicio usa el envelope {status, msg, data}.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

ME_URL = "/api/v1/auth/me"
VERIFY_URL = "/api/v1/auth/verify"
LOGIN_URL = "/api/v1/auth/login"
REGISTER_URL = "/api/v1/auth/register"

CREDENTIALS = {
    "nombre": "Juan Pérez",
    "email": "juan@taller.com",
    "contrasena": "secreto123",
    "rol": "COMPRADOR",
}


class MeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        with patch("accounts.events.publisher.publish"):
            self.client.post(REGISTER_URL, CREDENTIALS, format="json")
        login = self.client.post(
            LOGIN_URL,
            {"email": "juan@taller.com", "contrasena": "secreto123"},
            format="json",
        )
        self.token = login.json()["data"]["token"]

    def test_me_con_token_devuelve_el_usuario(self):
        response = self.client.get(ME_URL, HTTP_AUTHORIZATION=f"Bearer {self.token}")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], 200)
        self.assertEqual(body["data"]["email"], "juan@taller.com")
        self.assertEqual(body["data"]["rol"], "COMPRADOR")

    def test_me_sin_token_devuelve_401_envelope(self):
        response = self.client.get(ME_URL)

        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertEqual(body["status"], 401)
        self.assertIn("msg", body)


class VerifyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        with patch("accounts.events.publisher.publish"):
            self.client.post(REGISTER_URL, CREDENTIALS, format="json")

    def _token(self, lifetime=None):
        issued = datetime.now(timezone.utc)
        payload = {
            "user_id": 1,
            "rol": "COMPRADOR",
            "email": "juan@taller.com",
            "exp": issued + (lifetime or timedelta(seconds=3600)),
            "iat": issued,
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

    def test_verify_token_valido_respuesta_plana(self):
        token = self._token()
        response = self.client.post(
            VERIFY_URL, HTTP_AUTHORIZATION=f"Bearer {token}"
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        # Plano según contrato: sin envoltorio {status, msg, data}
        self.assertEqual(
            body,
            {
                "valid": True,
                "user_id": 1,
                "rol": "COMPRADOR",
                "email": "juan@taller.com",
            },
        )

    def test_verify_token_invalido_devuelve_401_valid_false(self):
        response = self.client.post(
            VERIFY_URL, HTTP_AUTHORIZATION="Bearer token-basura"
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"valid": False})

    def test_verify_token_expirado_devuelve_401_valid_false(self):
        token = self._token(lifetime=timedelta(seconds=-10))
        response = self.client.post(
            VERIFY_URL, HTTP_AUTHORIZATION=f"Bearer {token}"
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"valid": False})

    def test_verify_firma_con_jwt_secret_no_con_django_secret_key(self):
        """AGENTS.md 4.5: los servicios validan con JWT_SECRET; un token
        firmado con el secreto de Django NO debe ser aceptado."""
        issued = datetime.now(timezone.utc)
        foreign = jwt.encode(
            {
                "user_id": 1,
                "rol": "COMPRADOR",
                "email": "juan@taller.com",
                "exp": issued + timedelta(hours=1),
            },
            settings.SECRET_KEY,  # firma equivocada a propósito
            algorithm="HS256",
        )
        response = self.client.post(
            VERIFY_URL, HTTP_AUTHORIZATION=f"Bearer {foreign}"
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"valid": False})
