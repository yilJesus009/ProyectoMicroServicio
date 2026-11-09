package com.repuestosya.pedidos.application.commands;

import com.repuestosya.pedidos.application.EventTopics;
import com.repuestosya.pedidos.domain.entities.EventEnvelope;
import com.repuestosya.pedidos.domain.entities.Order;
import com.repuestosya.pedidos.domain.entities.OfferAcceptedPayload;
import com.repuestosya.pedidos.domain.entities.OrderFactory;
import com.repuestosya.pedidos.domain.repositories.OrderRepository;
import com.repuestosya.pedidos.domain.repositories.OutboxRepository;
import com.repuestosya.pedidos.domain.repositories.ProcessedEventRepository;
import java.time.Instant;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * El paso transaccional de {@link CreateOrderFromOfferAccepted}, en un bean
 * separado para que, si {@code orderRepository.save} choca con el índice
 * único de {@code offer_id}, la transacción completa se revierta sola
 * (Spring Data) y el llamador pueda reaccionar en una transacción NUEVA
 * (ver {@code markProcessedOnly} en la clase orquestadora). Separar en dos
 * beans es necesario: la auto-invocación no activa el proxy de @Transactional.
 */
@Component
class OrderCreationTransaction {

    private final OrderRepository orderRepository;
    private final OutboxRepository outboxRepository;
    private final ProcessedEventRepository processedEventRepository;

    OrderCreationTransaction(
            OrderRepository orderRepository,
            OutboxRepository outboxRepository,
            ProcessedEventRepository processedEventRepository) {
        this.orderRepository = orderRepository;
        this.outboxRepository = outboxRepository;
        this.processedEventRepository = processedEventRepository;
    }

    /**
     * Pedido + processed_events + outbox de ORDER_CREATED, en una sola
     * transacción (ajuste del equipo, 2026-11-10): si algo falla, nada de
     * esto queda guardado.
     */
    @Transactional
    void createOrderAndPublish(OfferAcceptedPayload payload, String eventId, String eventName, String correlationId) {
        Order order = OrderFactory.fromOfferAccepted(payload, Instant.now());
        Order saved = orderRepository.save(order);

        processedEventRepository.markProcessed(eventId, eventName);

        EventEnvelope envelope =
                EventEnvelope.of(
                        EventTopics.ORDER_CREATED, EventTopics.PRODUCER, correlationId, OrderEventPayloads.created(saved));
        outboxRepository.enqueue(envelope, EventTopics.ORDER_EVENTS_EXCHANGE, EventTopics.ORDER_CREATED);
    }
}
