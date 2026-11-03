"""Registro de usuarios: contrato de docs/contratos-api.md (Identity)."""
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User

REGISTER_URL = "/api/v1/auth/register"

VALID_PAYLOAD = {
    "nombre": "Juan Pérez",
    "email": "juan@taller.com",
    "contrasena": "secreto123",
    "telefono": "76543210",
    "ciudad": "La Paz",
    "rol": "COMPRADOR",
}


class RegisterTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch("accounts.events.publisher.publish")
    def test_registro_exitoso_devuelve_envelope_201(self, mock_publish):
        response = self.client.post(REGISTER_URL, VALID_PAYLOAD, format="json")

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["status"], 201)
        self.assertIn("msg", body)
        self.assertEqual(body["data"]["email"], "juan@taller.com")
        self.assertEqual(body["data"]["rol"], "COMPRADOR")
        self.assertEqual(body["data"]["nombre"], "Juan Pérez")
        self.assertIn("id", body["data"])
        # Nunca se expone la contraseña
        self.assertNotIn("contrasena", body["data"])
        self.assertNotIn("password", body["data"])

        user = User.objects.get(email="juan@taller.com")
        self.assertTrue(user.check_password("secreto123"))
        self.assertNotEqual(user.password, "secreto123")

    @patch("accounts.events.publisher.publish")
    def test_email_duplicado_devuelve_409(self, mock_publish):
        self.client.post(REGISTER_URL, VALID_PAYLOAD, format="json")
        response = self.client.post(REGISTER_URL, VALID_PAYLOAD, format="json")

        self.assertEqual(response.status_code, 409)
        body = response.json()
        self.assertEqual(body["status"], 409)
        self.assertEqual(User.objects.filter(email="juan@taller.com").count(), 1)

    def test_campos_obligatorios_faltantes_devuelven_400(self):
        response = self.client.post(
            REGISTER_URL, {"nombre": "Sin email ni resto"}, format="json"
        )

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body["status"], 400)
        self.assertIn("errors", body["data"])

    def test_rol_invalido_devuelve_400(self):
        payload = {**VALID_PAYLOAD, "rol": "SUPERUSER"}
        response = self.client.post(REGISTER_URL, payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["status"], 400)
        self.assertFalse(User.objects.filter(email="juan@taller.com").exists())

    @patch("accounts.events.publisher.publish")
    def test_publica_user_created_con_payload_del_contrato(self, mock_publish):
        self.client.post(REGISTER_URL, VALID_PAYLOAD, format="json")

        mock_publish.assert_called_once()
        kwargs = mock_publish.call_args.kwargs
        self.assertEqual(kwargs["topic"], "identity_events")
        self.assertEqual(kwargs["event_name"], "USER_CREATED")
        self.assertEqual(
            kwargs["payload"],
            {
                "user_id": User.objects.get(email="juan@taller.com").id,
                "email": "juan@taller.com",
                "role": "COMPRADOR",
                "city": "La Paz",
            },
        )

    @patch("accounts.events.publisher.publish", side_effect=RuntimeError("bus caido"))
    def test_si_el_bus_falla_el_registro_no_falla(self, mock_publish):
        """eventos.md regla 3: un fallo del bus no bloquea al productor."""
        response = self.client.post(REGISTER_URL, VALID_PAYLOAD, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(email="juan@taller.com").exists())
