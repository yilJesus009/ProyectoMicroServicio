package com.repuestosya.pedidos.application.commands;

import com.repuestosya.pedidos.application.EventTopics;
import com.repuestosya.pedidos.domain.entities.EventEnvelope;
import com.repuestosya.pedidos.domain.entities.Order;
import com.repuestosya.pedidos.domain.enums.OrderStatus;
import com.repuestosya.pedidos.domain.errors.ForbiddenException;
import com.repuestosya.pedidos.domain.errors.OrderNotFoundException;
import com.repuestosya.pedidos.domain.repositories.OrderRepository;
import com.repuestosya.pedidos.domain.repositories.OutboxRepository;
import java.time.Instant;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Caso de uso: POST /orders/{id}/confirm-receipt — solo el comprador dueño, solo si DELIVERED. */
@Component
public class ConfirmReceipt {

    private final OrderRepository orderRepository;
    private final OutboxRepository outboxRepository;

    public ConfirmReceipt(OrderRepository orderRepository, OutboxRepository outboxRepository) {
        this.orderRepository = orderRepository;
        this.outboxRepository = outboxRepository;
    }

    @Transactional
    public Order execute(Long orderId, Long actorId, String correlationId) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new OrderNotFoundException(orderId));

        if (!order.isOwnedByBuyer(actorId)) {
            throw new ForbiddenException("Solo el comprador dueño del pedido puede confirmar la recepción");
        }

        OrderStatus previous = order.getStatus();
        order.changeStatus(OrderStatus.COMPLETED, actorId, Instant.now());
        Order saved = orderRepository.save(order);

        EventEnvelope envelope =
                EventEnvelope.of(
                        EventTopics.ORDER_STATUS_CHANGED,
                        EventTopics.PRODUCER,
                        correlationId,
                        OrderEventPayloads.statusChanged(saved, previous, actorId));
        outboxRepository.enqueue(envelope, EventTopics.ORDER_EVENTS_EXCHANGE, EventTopics.ORDER_STATUS_CHANGED);

        return saved;
    }
}
