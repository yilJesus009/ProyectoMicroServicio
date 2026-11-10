package com.repuestosya.pedidos.application.commands;

import com.repuestosya.pedidos.application.EventTopics;
import com.repuestosya.pedidos.application.ports.PaymentGateway;
import com.repuestosya.pedidos.domain.entities.EventEnvelope;
import com.repuestosya.pedidos.domain.entities.Order;
import com.repuestosya.pedidos.domain.entities.Payment;
import com.repuestosya.pedidos.domain.enums.OrderStatus;
import com.repuestosya.pedidos.domain.enums.PaymentMethod;
import com.repuestosya.pedidos.domain.errors.ForbiddenException;
import com.repuestosya.pedidos.domain.errors.OrderNotFoundException;
import com.repuestosya.pedidos.domain.errors.PaymentAlreadyExistsException;
import com.repuestosya.pedidos.domain.repositories.OrderRepository;
import com.repuestosya.pedidos.domain.repositories.OutboxRepository;
import java.time.Instant;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Caso de uso: POST /orders/{id}/payment — solo el comprador dueño, solo si
 * PENDING_PAYMENT. El pago, el cambio a PREPARING, la fila del historial y
 * el outbox de ORDER_STATUS_CHANGED van en una sola transacción.
 *
 * Igual que con offer_id en {@link CreateOrderFromOfferAccepted}: un
 * segundo pago que pase el chequeo en memoria (dos requests casi
 * simultáneos) choca con el índice único de {@code payments.order_id} y se
 * traduce a 409, no a un 500.
 */
@Component
public class PayOrder {

    private final OrderRepository orderRepository;
    private final OutboxRepository outboxRepository;
    private final PaymentGateway paymentGateway;

    public PayOrder(OrderRepository orderRepository, OutboxRepository outboxRepository, PaymentGateway paymentGateway) {
        this.orderRepository = orderRepository;
        this.outboxRepository = outboxRepository;
        this.paymentGateway = paymentGateway;
    }

    @Transactional
    public Order execute(Long orderId, PaymentMethod method, Long actorId, String correlationId) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new OrderNotFoundException(orderId));

        if (!order.isOwnedByBuyer(actorId)) {
            throw new ForbiddenException("Solo el comprador dueño del pedido puede pagar");
        }

        OrderStatus previous = order.getStatus();
        Instant now = Instant.now();
        String reference = paymentGateway.generateReference(method, now);
        Payment payment = new Payment(null, orderId, method, reference, order.getPrice(), now);

        order.registerPayment(payment, actorId, now);

        Order saved;
        try {
            saved = orderRepository.save(order);
        } catch (DataIntegrityViolationException e) {
            if (!isPaymentConflict(e)) {
                throw e;
            }
            throw new PaymentAlreadyExistsException(orderId);
        }

        EventEnvelope envelope =
                EventEnvelope.of(
                        EventTopics.ORDER_STATUS_CHANGED,
                        EventTopics.PRODUCER,
                        correlationId,
                        OrderEventPayloads.statusChanged(saved, previous, actorId));
        outboxRepository.enqueue(envelope, EventTopics.ORDER_EVENTS_EXCHANGE, EventTopics.ORDER_STATUS_CHANGED);

        return saved;
    }

    private static boolean isPaymentConflict(Throwable error) {
        Throwable cause = error;
        while (cause != null) {
            String message = cause.getMessage();
            if (message != null && message.toLowerCase().contains("uq_payments_order_id")) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }
}
