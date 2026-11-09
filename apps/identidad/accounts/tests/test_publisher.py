"""Sobre estándar del publisher (docs/eventos.md).

El sobre DEBE llevar `event_id` (llave de idempotencia de los
consumidores) y `version`.
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
