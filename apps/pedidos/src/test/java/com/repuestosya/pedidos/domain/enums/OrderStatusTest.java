package com.repuestosya.pedidos.domain.enums;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class OrderStatusTest {

    @Test
    void entregaPasaPorEnCamino() {
        assertThat(OrderStatus.PENDING_PAYMENT.canTransitionTo(OrderStatus.PREPARING, DeliveryType.DELIVERY))
                .isTrue();
        assertThat(OrderStatus.PREPARING.canTransitionTo(OrderStatus.IN_TRANSIT, DeliveryType.DELIVERY))
                .isTrue();
        assertThat(OrderStatus.PREPARING.canTransitionTo(OrderStatus.READY_FOR_PICKUP, DeliveryType.DELIVERY))
                .isFalse();
        assertThat(OrderStatus.IN_TRANSIT.canTransitionTo(OrderStatus.DELIVERED, DeliveryType.DELIVERY))
                .isTrue();
        assertThat(OrderStatus.DELIVERED.canTransitionTo(OrderStatus.COMPLETED, DeliveryType.DELIVERY))
                .isTrue();
    }

    @Test
    void retiroPasaPorListoParaRetiro() {
        assertThat(OrderStatus.PREPARING.canTransitionTo(OrderStatus.READY_FOR_PICKUP, DeliveryType.PICKUP))
                .isTrue();
        assertThat(OrderStatus.PREPARING.canTransitionTo(OrderStatus.IN_TRANSIT, DeliveryType.PICKUP))
                .isFalse();
        assertThat(OrderStatus.READY_FOR_PICKUP.canTransitionTo(OrderStatus.DELIVERED, DeliveryType.PICKUP))
                .isTrue();
    }

    @Test
    void completedNoTieneSiguienteEstado() {
        assertThat(OrderStatus.COMPLETED.allowedNext(DeliveryType.DELIVERY)).isEmpty();
        assertThat(OrderStatus.COMPLETED.canTransitionTo(OrderStatus.PENDING_PAYMENT, DeliveryType.DELIVERY))
                .isFalse();
    }

    @Test
    void noSePuedeSaltarEstados() {
        assertThat(OrderStatus.PENDING_PAYMENT.canTransitionTo(OrderStatus.DELIVERED, DeliveryType.DELIVERY))
                .isFalse();
        assertThat(OrderStatus.PENDING_PAYMENT.canTransitionTo(OrderStatus.COMPLETED, DeliveryType.PICKUP))
                .isFalse();
    }
}
