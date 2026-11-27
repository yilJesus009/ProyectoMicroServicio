package com.repuestosya.pedidos.application.commands;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.repuestosya.pedidos.application.ports.PaymentGateway;
import com.repuestosya.pedidos.domain.entities.Order;
import com.repuestosya.pedidos.domain.entities.OrderStatusHistoryEntry;
import com.repuestosya.pedidos.domain.enums.DeliveryType;
import com.repuestosya.pedidos.domain.enums.OrderStatus;
import com.repuestosya.pedidos.domain.enums.PaymentMethod;
import com.repuestosya.pedidos.domain.errors.ForbiddenException;
import com.repuestosya.pedidos.domain.errors.InvalidOrderTransitionException;
import com.repuestosya.pedidos.domain.errors.OrderNotFoundException;
import com.repuestosya.pedidos.domain.errors.PaymentAlreadyExistsException;
import com.repuestosya.pedidos.domain.repositories.OrderRepository;
import com.repuestosya.pedidos.domain.repositories.OutboxRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

class PayOrderTest {

    private final OrderRepository orderRepository = mock(OrderRepository.class);
    private final OutboxRepository outboxRepository = mock(OutboxRepository.class);
    private final PaymentGateway paymentGateway = mock(PaymentGateway.class);
    private final PayOrder payOrder = new PayOrder(orderRepository, outboxRepository, paymentGateway);

    private Order newOrder(OrderStatus status) {
        Instant now = Instant.now();
        return new Order(
                1L, 10L, 20L, 30L, 40L, "AutoParts Center", "Frenos delanteros", "Toyota Corolla 2018",
                new BigDecimal("620"), "BOB", DeliveryType.DELIVERY, 3, status,
                List.of(OrderStatusHistoryEntry.initial(30L, now)), null, now, now);
    }

    @Test
    void lanza404SiElPedidoNoExiste() {
        when(orderRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> payOrder.execute(1L, PaymentMethod.QR, 30L, "corr"))
                .isInstanceOf(OrderNotFoundException.class);
    }

    @Test
    void lanza403SiElActorNoEsElCompradorDueño() {
        Order order = newOrder(OrderStatus.PENDING_PAYMENT);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> payOrder.execute(1L, PaymentMethod.QR, 999L, "corr"))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void lanza422SiElPedidoNoEstaPendingPayment() {
        Order order = newOrder(OrderStatus.PREPARING);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> payOrder.execute(1L, PaymentMethod.QR, 30L, "corr"))
                .isInstanceOf(InvalidOrderTransitionException.class);
    }

    @Test
    void unSegundoPagoEnMemoriaDa409() {
        Order order = newOrder(OrderStatus.PENDING_PAYMENT);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(paymentGateway.generateReference(any(), any())).thenReturn("PAY-20261110-000012");
        order.registerPayment(
                new com.repuestosya.pedidos.domain.entities.Payment(
                        null, 1L, PaymentMethod.CARD, "PAY-20261110-000011", new BigDecimal("620"), Instant.now()),
                30L,
                Instant.now());

        assertThatThrownBy(() -> payOrder.execute(1L, PaymentMethod.QR, 30L, "corr"))
                .isInstanceOf(PaymentAlreadyExistsException.class);
    }

    @Test
    void unSegundoPagoPorConflictoDeBaseDa409() {
        Order order = newOrder(OrderStatus.PENDING_PAYMENT);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(paymentGateway.generateReference(any(), any())).thenReturn("PAY-20261110-000012");
        when(orderRepository.save(order))
                .thenThrow(
                        new DataIntegrityViolationException(
                                "duplicate key value violates unique constraint \"uq_payments_order_id\""));

        assertThatThrownBy(() -> payOrder.execute(1L, PaymentMethod.QR, 30L, "corr"))
                .isInstanceOf(PaymentAlreadyExistsException.class);
    }

    @Test
    void otroErrorDeIntegridadSeRelanza() {
        Order order = newOrder(OrderStatus.PENDING_PAYMENT);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(paymentGateway.generateReference(any(), any())).thenReturn("PAY-20261110-000012");
        when(orderRepository.save(order))
                .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint \"otra\""));

        assertThatThrownBy(() -> payOrder.execute(1L, PaymentMethod.QR, 30L, "corr"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void registraElPagoYEncolaOrderStatusChanged() {
        Order order = newOrder(OrderStatus.PENDING_PAYMENT);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(paymentGateway.generateReference(eq(PaymentMethod.QR), any())).thenReturn("PAY-20261110-000012");
        when(orderRepository.save(order)).thenReturn(order);

        Order result = payOrder.execute(1L, PaymentMethod.QR, 30L, "corr");

        assertThat(result.getStatus()).isEqualTo(OrderStatus.PREPARING);
        assertThat(result.getPayment().reference()).isEqualTo("PAY-20261110-000012");
        assertThat(result.getPayment().method()).isEqualTo(PaymentMethod.QR);
        verify(orderRepository).save(order);
        verify(outboxRepository).enqueue(any(), any(), any());
    }
}
