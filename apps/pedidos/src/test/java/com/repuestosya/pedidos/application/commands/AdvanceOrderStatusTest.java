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

class AdvanceOrderStatusTest {

    private final OrderRepository orderRepository = mock(OrderRepository.class);
    private final OutboxRepository outboxRepository = mock(OutboxRepository.class);
    private final AdvanceOrderStatus advanceOrderStatus = new AdvanceOrderStatus(orderRepository, outboxRepository);

    private Order newOrder(OrderStatus status, DeliveryType deliveryType) {
        Instant now = Instant.now();
        return new Order(
                1L, 10L, 20L, 30L, 40L, "AutoParts Center", "Frenos delanteros", "Toyota Corolla 2018",
                new BigDecimal("620"), "BOB", deliveryType, 3, status,
                List.of(OrderStatusHistoryEntry.initial(30L, now)), now, now);
    }

    @Test
    void lanza404SiElPedidoNoExiste() {
        when(orderRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> advanceOrderStatus.execute(1L, OrderStatus.IN_TRANSIT, 40L, "corr"))
                .isInstanceOf(OrderNotFoundException.class);
    }

    @Test
    void lanza403SiElActorNoEsElProveedorDueño() {
        Order order = newOrder(OrderStatus.PREPARING, DeliveryType.DELIVERY);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> advanceOrderStatus.execute(1L, OrderStatus.IN_TRANSIT, 999L, "corr"))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void lanza422SiElDestinoNoEsAlcanzablePorEsteEndpoint() {
        Order order = newOrder(OrderStatus.PENDING_PAYMENT, DeliveryType.DELIVERY);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> advanceOrderStatus.execute(1L, OrderStatus.PREPARING, 40L, "corr"))
                .isInstanceOf(InvalidOrderTransitionException.class);
    }

    @Test
    void avanzaYEncolaOrderStatusChanged() {
        Order order = newOrder(OrderStatus.PREPARING, DeliveryType.DELIVERY);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(order)).thenReturn(order);

        Order result = advanceOrderStatus.execute(1L, OrderStatus.IN_TRANSIT, 40L, "corr");

        assertThat(result.getStatus()).isEqualTo(OrderStatus.IN_TRANSIT);
        verify(orderRepository).save(order);
        verify(outboxRepository).enqueue(any(), any(), any());
    }
}
