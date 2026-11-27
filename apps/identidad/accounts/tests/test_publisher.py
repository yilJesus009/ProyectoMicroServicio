"""Sobre estándar y reintento simple del publisher (docs/eventos.md).

El sobre DEBE llevar `event_id` (llave de idempotencia de los consumidores)
y `version`; y el publish tiene 3 intentos antes de rendirse, sin lanzar
jamás hacia arriba (fire-and-forget).
"""
import json
import uuid
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from accounts.events import publisher


class EnvelopeTests(SimpleTestCase):
    def _publicar_y_leer_sobre(self):
        connection = MagicMock()
        with patch(
            "accounts.events.publisher.messaging.get_connection",
            return_value=connection,
        ):
            publisher.publish(
                "identity_events",
                "USER_CREATED",
                {"user_id": 1},
                correlation_id="corr-42",
            )
        channel = connection.channel.return_value
        channel.basic_publish.assert_called_once()
        return json.loads(channel.basic_publish.call_args.kwargs["body"])

    def test_sobre_lleva_event_id_uuid_version_y_productor(self):
        sobre = self._publicar_y_leer_sobre()

        uuid.UUID(sobre["event_id"])  # lanza si no es UUID válido
        self.assertEqual(sobre["version"], 1)
        self.assertEqual(sobre["event_name"], "USER_CREATED")
        self.assertEqual(sobre["producer"], "identity-service")
        self.assertEqual(sobre["correlation_id"], "corr-42")
        self.assertEqual(sobre["payload"], {"user_id": 1})
        self.assertIn("occurred_at", sobre)

    def test_event_id_es_distinto_en_cada_publicacion(self):
        primero = self._publicar_y_leer_sobre()
        segundo = self._publicar_y_leer_sobre()

        self.assertNotEqual(primero["event_id"], segundo["event_id"])

    def test_sin_correlation_id_genera_uno(self):
        connection = MagicMock()
        with patch(
            "accounts.events.publisher.messaging.get_connection",
            return_value=connection,
        ):
            publisher.publish("identity_events", "USER_CREATED", {"user_id": 1})

        channel = connection.channel.return_value
        sobre = json.loads(channel.basic_publish.call_args.kwargs["body"])
        uuid.UUID(sobre["correlation_id"])


class ReintentosTests(SimpleTestCase):
    @patch("accounts.events.publisher.time.sleep")
    @patch(
        "accounts.events.publisher.messaging.get_connection",
        side_effect=RuntimeError("bus caido"),
    )
    def test_si_el_bus_falla_reintenta_tres_veces_sin_lanzar(
        self, mock_get, mock_sleep
    ):
        publisher.publish("identity_events", "USER_CREATED", {"user_id": 1})

        self.assertEqual(mock_get.call_count, 3)
        self.assertEqual(mock_sleep.call_count, 2)  # espera entre intentos

    @patch("accounts.events.publisher.time.sleep")
    def test_se_publica_en_el_tercer_intento(self, mock_sleep):
        connection_ok = MagicMock()
        mock_get = MagicMock(
            side_effect=[
                RuntimeError("bus caido"),
                RuntimeError("bus caido"),
                connection_ok,
            ]
        )
        with patch(
            "accounts.events.publisher.messaging.get_connection", mock_get
        ):
            publisher.publish("identity_events", "USER_CREATED", {"user_id": 1})

        self.assertEqual(mock_get.call_count, 3)
        channel = connection_ok.channel.return_value
        channel.basic_publish.assert_called_once()
        connection_ok.close.assert_called_once()
