package com.repuestosya.pedidos.domain.entities;

import com.repuestosya.pedidos.domain.enums.OrderStatus;
import java.time.Instant;

/**
 * Una fila del historial de estados. {@code fromStatus} es {@code null}
 * solo en la primera fila (el pedido recién creado, docs/contratos-api.md).
 */
public record OrderStatusHistoryEntry(
        Long id, OrderStatus fromStatus, OrderStatus toStatus, Long changedBy, Instant changedAt) {

    public static OrderStatusHistoryEntry initial(Long changedBy, Instant changedAt) {
        return new OrderStatusHistoryEntry(null, null, OrderStatus.PENDING_PAYMENT, changedBy, changedAt);
    }

    public static OrderStatusHistoryEntry of(
            OrderStatus from, OrderStatus to, Long changedBy, Instant changedAt) {
        return new OrderStatusHistoryEntry(null, from, to, changedBy, changedAt);
    }
}
