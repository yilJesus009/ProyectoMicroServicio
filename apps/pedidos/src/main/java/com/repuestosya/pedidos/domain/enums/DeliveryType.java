package com.repuestosya.pedidos.domain.enums;

/**
 * Patrón Strategy: cada tipo de entrega decide por sí mismo a qué estado
 * pasa el pedido después de {@link OrderStatus#PREPARING} (docs/flujo-principal.md).
 */
public enum DeliveryType {
    PICKUP {
        @Override
        public OrderStatus nextAfterPreparing() {
            return OrderStatus.READY_FOR_PICKUP;
        }
    },
    DELIVERY {
        @Override
        public OrderStatus nextAfterPreparing() {
            return OrderStatus.IN_TRANSIT;
        }
    };

    public abstract OrderStatus nextAfterPreparing();
}
