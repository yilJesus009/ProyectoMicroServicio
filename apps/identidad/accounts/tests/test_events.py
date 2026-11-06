"""USER_ROLE_CHANGED: cambio de rol vía user_service (lo usa el Admin)."""
from unittest.mock import patch

from django.test import TestCase

from accounts.exceptions import InvalidRoleException
from accounts.models import User
from accounts.services import user_service


class ChangeRoleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="juan@taller.com",
            password="secreto123",
            nombre="Juan Pérez",
            rol="COMPRADOR",
        )

    @patch("accounts.events.publisher.publish")
    def test_cambio_de_rol_publica_user_role_changed(self, mock_publish):
        user_service.change_role(self.user, "PROVEEDOR")

        self.user.refresh_from_db()
        self.assertEqual(self.user.rol, "PROVEEDOR")

        mock_publish.assert_called_once()
        kwargs = mock_publish.call_args.kwargs
        self.assertEqual(kwargs["topic"], "identity_events")
        self.assertEqual(kwargs["event_name"], "USER_ROLE_CHANGED")
        self.assertEqual(
            kwargs["payload"],
            {
                "user_id": self.user.id,
                "previous_role": "COMPRADOR",
                "new_role": "PROVEEDOR",
            },
        )

    @patch("accounts.events.publisher.publish")
    def test_rol_igual_no_publica_nada(self, mock_publish):
        user_service.change_role(self.user, "COMPRADOR")

        mock_publish.assert_not_called()

    def test_rol_invalido_lanza_excepcion_de_dominio(self):
        with self.assertRaises(InvalidRoleException):
            user_service.change_role(self.user, "SUPERUSER")
        self.user.refresh_from_db()
        self.assertEqual(self.user.rol, "COMPRADOR")

    @patch("accounts.events.publisher.publish", side_effect=RuntimeError("bus caido"))
    def test_si_el_bus_falla_el_cambio_no_falla(self, mock_publish):
        user_service.change_role(self.user, "PROVEEDOR")

        self.user.refresh_from_db()
        self.assertEqual(self.user.rol, "PROVEEDOR")

    @patch("accounts.events.publisher.publish")
    def test_evento_lleva_el_correlation_id_recibido(self, mock_publish):
        user_service.change_role(self.user, "PROVEEDOR", correlation_id="corr-77")

        self.assertEqual(
            mock_publish.call_args.kwargs["correlation_id"], "corr-77"
        )
