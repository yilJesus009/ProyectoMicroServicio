package com.repuestosya.pedidos.infrastructure.messaging;

/**
 * El mensaje no es JSON válido, o le falta {@code event_id}. Cualquier
 * excepción que salga del {@code @RabbitListener} hace que el contenedor
 * rechace sin reencolar (spring.rabbitmq.listener.simple.default-requeue-rejected:
 * false) → va a la dlq, igual que en Negociación y Notificaciones.
 */
public class MalformedEventException extends RuntimeException {
    public MalformedEventException(String message) {
        super(message);
    }

    public MalformedEventException(String message, Throwable cause) {
        super(message, cause);
    }
}
