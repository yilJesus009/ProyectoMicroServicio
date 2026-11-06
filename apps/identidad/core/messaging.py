"""
Conexión a RabbitMQ (infraestructura compartida).

Un microservicio NUNCA consulta la base de otro: los datos ajenos llegan
por HTTP o por eventos. Este módulo solo publica.
"""
import logging

import pika
from django.conf import settings

logger = logging.getLogger(__name__)


def get_connection():
    """Abre una conexión a RabbitMQ con la configuración del entorno."""
    credentials = pika.PlainCredentials(
        settings.RABBITMQ_USER, settings.RABBITMQ_PASS
    )
    params = pika.ConnectionParameters(
        host=settings.RABBITMQ_HOST,
        port=settings.RABBITMQ_PORT,
        credentials=credentials,
    )
    return pika.BlockingConnection(params)
