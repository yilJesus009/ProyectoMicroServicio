"""
Productor RabbitMQ del Identity Service.

Envelope de docs/eventos.md:
  {event_id, event_name, version, occurred_at, correlation_id, producer, payload}

Reglas:
  - Exchange tipo "topic", durable; routing_key = nombre del evento.
  - Se publica DESPUÉS de persistir, nunca antes.
  - Reintento simple (3 intentos) y fire-and-forget: NUNCA lanza hacia
    arriba. Si el bus sigue caído, el registro/login no puede fallar
    (eventos.md: "Identidad publica ... con reintento simple").
"""
import json
import logging
import time
import uuid
from datetime import datetime, timezone

import pika

from core import messaging

logger = logging.getLogger(__name__)

MAX_INTENTOS = 3
ESPERA_REINTENTO_SEG = 0.2


def publish(topic, event_name, payload, correlation_id=None):
    # El sobre se arma UNA vez: event_id y occurred_at son los mismos en
    # cada reintento (los consumidores usan event_id para no duplicar).
    message = {
        "event_id": str(uuid.uuid4()),
        "event_name": event_name,
        "version": 1,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "correlation_id": correlation_id or str(uuid.uuid4()),
        "producer": "identity-service",
        "payload": payload,
    }
    body = json.dumps(message, ensure_ascii=False)

    for intento in range(1, MAX_INTENTOS + 1):
        connection = None
        try:
            connection = messaging.get_connection()
            channel = connection.channel()
            channel.exchange_declare(
                exchange=topic, exchange_type="topic", durable=True
            )
            channel.basic_publish(
                exchange=topic,
                routing_key=event_name,
                body=body,
                # delivery_mode=2 → mensaje persistente (sobrevive a reinicios)
                properties=pika.BasicProperties(
                    delivery_mode=2, content_type="application/json"
                ),
            )
            connection.close()
            return
        except Exception as exc:  # noqa: BLE001 - fire-and-forget deliberado
            if connection is not None:
                try:
                    connection.close()
                except Exception:  # noqa: BLE001 - la conexión ya murió
                    pass
            logger.error(
                "No se pudo publicar %s en %s (intento %s/%s): %s",
                event_name,
                topic,
                intento,
                MAX_INTENTOS,
                exc,
            )
            if intento < MAX_INTENTOS:
                time.sleep(ESPERA_REINTENTO_SEG)
    # Se agotaron los intentos: queda el log, jamás se lanza hacia arriba.
