package com.repuestosya.pedidos.domain.entities;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.repuestosya.pedidos.domain.enums.DeliveryType;
import com.repuestosya.pedidos.domain.enums.OrderStatus;
import com.repuestosya.pedidos.domain.enums.PaymentMethod;
import com.repuestosya.pedidos.domain.errors.InvalidOrderTransitionException;
import com.repuestosya.pedidos.domain.errors.PaymentAlreadyExistsException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class OrderTest {

    private Order newOrder(DeliveryType deliveryType) {
        Instant now = Instant.now();
        return new Order(
                1L,
                10L,
                20L,
                30L,
                40L,
                "AutoParts Center",
                "Frenos delanteros",
                "Toyota Corolla 2018",
                new BigDecimal("620"),
                "BOB",
                deliveryType,
                3,
                OrderStatus.PENDING_PAYMENT,
                List.of(OrderStatusHistoryEntry.initial(30L, now)),
                null,
                now,
                now);
    }

    @Test
    void cambiaDeEstadoYRegistraHistorial() {
        Order order = newOrder(DeliveryType.DELIVERY);

        order.changeStatus(OrderStatus.PREPARING, 40L, Instant.now());

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PREPARING);
        assertThat(order.getHistory()).hasSize(2);
        assertThat(order.getHistory().get(1).fromStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);
        assertThat(order.getHistory().get(1).toStatus()).isEqualTo(OrderStatus.PREPARING);
    }

    @Test
    void rechazaTransicionInvalida() {
        Order order = newOrder(DeliveryType.DELIVERY);

        assertThatThrownBy(() -> order.changeStatus(OrderStatus.DELIVERED, 40L, Instant.now()))
                .isInstanceOf(InvalidOrderTransitionException.class);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);
        assertThat(order.getHistory()).hasSize(1);
    }

    @Test
    void registraElPagoYPasaAPreparing() {
        Order order = newOrder(DeliveryType.DELIVERY);
        Payment payment = new Payment(null, 1L, PaymentMethod.QR, "PAY-20261110-000012", new BigDecimal("620"), Instant.now());

        order.registerPayment(payment, 30L, Instant.now());

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PREPARING);
        assertThat(order.getPayment()).isEqualTo(payment);
        assertThat(order.getHistory()).hasSize(2);
    }

    @Test
    void unSegundoPagoDa409() {
        Order order = newOrder(DeliveryType.DELIVERY);
        Payment firstPayment =
                new Payment(null, 1L, PaymentMethod.QR, "PAY-20261110-000012", new BigDecimal("620"), Instant.now());
        order.registerPayment(firstPayment, 30L, Instant.now());

        Payment secondPayment =
                new Payment(null, 1L, PaymentMethod.CARD, "PAY-20261110-000013", new BigDecimal("620"), Instant.now());

        assertThatThrownBy(() -> order.registerPayment(secondPayment, 30L, Instant.now()))
                .isInstanceOf(PaymentAlreadyExistsException.class);
        assertThat(order.getPayment()).isEqualTo(firstPayment);
    }

    @Test
    void pagarUnPedidoQueNoEstaPendingPaymentDa422() {
        Order order = newOrder(DeliveryType.DELIVERY);
        order.changeStatus(OrderStatus.PREPARING, 40L, Instant.now());
        Payment payment = new Payment(null, 1L, PaymentMethod.QR, "PAY-20261110-000012", new BigDecimal("620"), Instant.now());

        assertThatThrownBy(() -> order.registerPayment(payment, 30L, Instant.now()))
                .isInstanceOf(InvalidOrderTransitionException.class);
        assertThat(order.getPayment()).isNull();
    }

    @Test
    void dueñoYVisibilidad() {
        Order order = newOrder(DeliveryType.DELIVERY);

        assertThat(order.isOwnedByBuyer(30L)).isTrue();
        assertThat(order.isOwnedBySupplier(40L)).isTrue();
        assertThat(order.isVisibleTo(30L)).isTrue();
        assertThat(order.isVisibleTo(40L)).isTrue();
        assertThat(order.isVisibleTo(999L)).isFalse();
    }
}
