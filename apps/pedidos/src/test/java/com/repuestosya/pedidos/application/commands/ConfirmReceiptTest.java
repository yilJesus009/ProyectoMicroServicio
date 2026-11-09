package com.repuestosya.pedidos.application.commands;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.repuestosya.pedidos.domain.entities.Order;
import com.repuestosya.pedidos.domain.entities.OrderStatusHistoryEntry;
import com.repuestosya.pedidos.domain.enums.DeliveryType;
import com.repuestosya.pedidos.domain.enums.OrderStatus;
import com.repuestosya.pedidos.domain.errors.ForbiddenException;
import com.repuestosya.pedidos.domain.errors.InvalidOrderTransitionException;
import com.repuestosya.pedidos.domain.errors.OrderNotFoundException;
import com.repuestosya.pedidos.domain.repositories.OrderRepository;
import com.repuestosya.pedidos.domain.repositories.OutboxRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ConfirmReceiptTest {

    private final OrderRepository orderRepository = mock(OrderRepository.class);
    private final OutboxRepository outboxRepository = mock(OutboxRepository.class);
    private final ConfirmReceipt confirmReceipt = new ConfirmReceipt(orderRepository, outboxRepository);

    private Order newOrder(OrderStatus status) {
        Instant now = Instant.now();
        return new Order(
                1L, 10L, 20L, 30L, 40L, "AutoParts Center", "Frenos delanteros", "Toyota Corolla 2018",
                new BigDecimal("620"), "BOB", DeliveryType.DELIVERY, 3, status,
                List.of(OrderStatusHistoryEntry.initial(30L, now)), now, now);
    }

    @Test
    void lanza404SiElPedidoNoExiste() {
        when(orderRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> confirmReceipt.execute(1L, 30L, "corr"))
                .isInstanceOf(OrderNotFoundException.class);
    }

    @Test
    void lanza403SiElActorNoEsElCompradorDueño() {
        Order order = newOrder(OrderStatus.DELIVERED);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> confirmReceipt.execute(1L, 999L, "corr"))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void lanza422SiElPedidoNoEstaEntregado() {
        Order order = newOrder(OrderStatus.IN_TRANSIT);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> confirmReceipt.execute(1L, 30L, "corr"))
                .isInstanceOf(InvalidOrderTransitionException.class);
    }

    @Test
    void confirmaYEncolaOrderStatusChanged() {
        Order order = newOrder(OrderStatus.DELIVERED);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(order)).thenReturn(order);

        Order result = confirmReceipt.execute(1L, 30L, "corr");

        assertThat(result.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        verify(orderRepository).save(order);
        verify(outboxRepository).enqueue(any(), any(), any());
    }
}
