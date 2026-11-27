package com.repuestosya.pedidos.infrastructure.messaging;

import com.repuestosya.pedidos.domain.repositories.OutboxRepository;
import com.repuestosya.pedidos.domain.repositories.OutboxRepository.PendingEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Publica el outbox cada 1.5 s, con confirmación de RabbitMQ (docs/eventos.md).
 * Si un evento falla, queda pendiente ({@code published_at} sigue nulo) y
 * se reintenta en el siguiente ciclo; los demás no se ven afectados.
 * Mismo patrón que outboxPublisherWorker.js de Negociación.
 */
@Component
public class OutboxPublisherScheduler {

    private static final Logger log = LoggerFactory.getLogger(OutboxPublisherScheduler.class);
    private static final int BATCH_SIZE = 20;
    private static final long CONFIRM_TIMEOUT_MS = 5000;

    private final OutboxRepository outboxRepository;
    private final RabbitTemplate rabbitTemplate;

    public OutboxPublisherScheduler(OutboxRepository outboxRepository, RabbitTemplate rabbitTemplate) {
        this.outboxRepository = outboxRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    @Scheduled(fixedDelay = 1500)
    public void publishPending() {
        for (PendingEvent event : outboxRepository.findUnpublished(BATCH_SIZE)) {
            try {
                publishWithConfirm(event);
                outboxRepository.markPublished(event.id());
            } catch (Exception e) {
                outboxRepository.incrementAttempts(event.id());
                log.error("No se pudo publicar {} en {}: {}", event.id(), event.exchange(), e.getMessage());
            }
        }
    }

    private void publishWithConfirm(PendingEvent event) {
        rabbitTemplate.invoke(
                operations -> {
                    MessageProperties properties = new MessageProperties();
                    properties.setContentType("application/json");
                    properties.setDeliveryMode(MessageDeliveryMode.PERSISTENT);
                    Message message = new Message(event.payloadJson().getBytes(), properties);

                    operations.send(event.exchange(), event.routingKey(), message);
                    operations.waitForConfirmsOrDie(CONFIRM_TIMEOUT_MS);
                    return null;
                });
    }
}
