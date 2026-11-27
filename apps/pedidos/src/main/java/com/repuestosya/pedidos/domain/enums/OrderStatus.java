package com.repuestosya.pedidos.domain.enums;

import java.util.Set;

/**
 * Patrón State: cada estado del pedido sabe a cuáles puede pasar
 * (docs/flujo-principal.md). La rama después de {@link #PREPARING} no es
 * fija: se la pregunta a la Strategy ({@link DeliveryType#nextAfterPreparing()}),
 * según si el pedido es de retiro o entrega.
 *
 * <pre>
 * PENDING_PAYMENT ──(pago)──► PREPARING ──┬─DELIVERY──► IN_TRANSIT ────┬──► DELIVERED ──(comprador)──► COMPLETED
 *                                         └─PICKUP───► READY_FOR_PICKUP ┘
 * </pre>
 */
public enum OrderStatus {
    PENDING_PAYMENT,
    PREPARING,
    IN_TRANSIT,
    READY_FOR_PICKUP,
    DELIVERED,
    COMPLETED;

    /**
     * Estados a los que este estado puede pasar. Para {@link #PREPARING},
     * la Strategy ({@code deliveryType}) decide cuál de las dos ramas es
     * la correcta para ESTE pedido.
     */
    public Set<OrderStatus> allowedNext(DeliveryType deliveryType) {
        return switch (this) {
            case PENDING_PAYMENT -> Set.of(PREPARING);
            case PREPARING -> Set.of(deliveryType.nextAfterPreparing());
            case IN_TRANSIT, READY_FOR_PICKUP -> Set.of(DELIVERED);
            case DELIVERED -> Set.of(COMPLETED);
            case COMPLETED -> Set.of();
        };
    }

    public boolean canTransitionTo(OrderStatus target, DeliveryType deliveryType) {
        return allowedNext(deliveryType).contains(target);
    }
}
