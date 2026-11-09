"""
Productor RabbitMQ del Identity Service.

Envelope de docs/eventos.md:
  {event_id, event_name, version, occurred_at, correlation_id, producer, payload}

Reglas:
  - Exchange tipo "topic", durable; routing_key = nombre del evento.
  - Se publica DESPUÉS de persistir, nunca antes.
  - El publish es fire-and-forget: NUNCA lanza hacia arriba. Si el bus
    está caído, el registro/login no puede fallar (eventos.md regla 3).
"""
import json
import logging
import uuid
from datetime import datetime, timezone

import pika

from core import messaging

logger = logging.getLogger(__name__)


def publish(topic, event_name, payload, correlation_id=None):
    try:
        connection = messaging.get_connection()
        channel = connection.channel()
        channel.exchange_declare(exchange=topic, exchange_type="topic", durable=True)

        message = {
            "event_id": str(uuid.uuid4()),
            "event_name": event_name,
            "version": 1,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "correlation_id": correlation_id or str(uuid.uuid4()),
            "producer": "identity-service",
            "payload": payload,
        }
        channel.basic_publish(
            exchange=topic,
            routing_key=event_name,
            body=json.dumps(message, ensure_ascii=False),
            # delivery_mode=2 → mensaje persistente (sobrevive a reinicios)
            properties=pika.BasicProperties(
                delivery_mode=2, content_type="application/json"
            ),
        )
        connection.close()
    except Exception as exc:  # noqa: BLE001 - fire-and-forget deliberado
        logger.error(
            "No se pudo publicar %s en %s: %s", event_name, topic, exc
        )
