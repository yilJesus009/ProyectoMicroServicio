package com.repuestosya.pedidos.application.commands;

import com.repuestosya.pedidos.application.EventTopics;
import com.repuestosya.pedidos.domain.entities.EventEnvelope;
import com.repuestosya.pedidos.domain.entities.Order;
import com.repuestosya.pedidos.domain.enums.OrderStatus;
import com.repuestosya.pedidos.domain.errors.ForbiddenException;
import com.repuestosya.pedidos.domain.errors.InvalidOrderTransitionException;
import com.repuestosya.pedidos.domain.errors.OrderNotFoundException;
import com.repuestosya.pedidos.domain.repositories.OrderRepository;
import com.repuestosya.pedidos.domain.repositories.OutboxRepository;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Caso de uso: PATCH /orders/{id}/status — solo el proveedor dueño avanza
 * el pedido. {@code PENDING_PAYMENT → PREPARING} lo hace el pago
 * (ConfirmPayment, fase 2) y {@code DELIVERED → COMPLETED} lo hace el
 * comprador (ConfirmReceipt): ninguno de los dos entra por acá.
 */
@Component
public class AdvanceOrderStatus {

    /** Los únicos estados a los que este endpoint puede llevar un pedido. */
    private static final Set<OrderStatus> REACHABLE_BY_SUPPLIER =
            EnumSet.of(OrderStatus.IN_TRANSIT, OrderStatus.READY_FOR_PICKUP, OrderStatus.DELIVERED);

    private final OrderRepository orderRepository;
    private final OutboxRepository outboxRepository;

    public AdvanceOrderStatus(OrderRepository orderRepository, OutboxRepository outboxRepository) {
        this.orderRepository = orderRepository;
        this.outboxRepository = outboxRepository;
    }

    @Transactional
    public Order execute(Long orderId, OrderStatus target, Long actorId, String correlationId) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new OrderNotFoundException(orderId));

        if (!order.isOwnedBySupplier(actorId)) {
            throw new ForbiddenException("Solo el proveedor dueño del pedido puede cambiar su estado");
        }
        if (!REACHABLE_BY_SUPPLIER.contains(target)) {
            throw new InvalidOrderTransitionException(order.getStatus(), target);
        }

        OrderStatus previous = order.getStatus();
        order.changeStatus(target, actorId, Instant.now());
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
