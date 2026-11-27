package com.repuestosya.pedidos.infrastructure.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.repuestosya.pedidos.application.commands.CreateOrderFromOfferAccepted;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Consume la cola {@code pedidos.offer_accepted}, declarada en
 * {@link RabbitMqConfig} con los MISMOS argumentos de la fase 1 (dlx +
 * su .dlq) — si cambiaran, RabbitMQ rechazaría la cola y el servicio no
 * arrancaría. Por eso acá solo se referencia la cola por nombre, sin
 * volver a declarar nada.
 *
 * Cualquier excepción (sin event_id, JSON inválido, o un error real del
 * caso de uso) hace que el contenedor la rechace sin reencolar
 * (application.yml: default-requeue-rejected=false) → va a la dlq.
 */
@Component
public class OfferAcceptedListener {

    private final ObjectMapper objectMapper;
    private final CreateOrderFromOfferAccepted createOrderFromOfferAccepted;

    public OfferAcceptedListener(ObjectMapper objectMapper, CreateOrderFromOfferAccepted createOrderFromOfferAccepted) {
        this.objectMapper = objectMapper;
        this.createOrderFromOfferAccepted = createOrderFromOfferAccepted;
    }

    @RabbitListener(queues = RabbitMqConfig.OFFER_ACCEPTED_QUEUE)
    public void onMessage(Message message) {
        OfferAcceptedMessageHandler.handle(message.getBody(), objectMapper, createOrderFromOfferAccepted);
    }
}
