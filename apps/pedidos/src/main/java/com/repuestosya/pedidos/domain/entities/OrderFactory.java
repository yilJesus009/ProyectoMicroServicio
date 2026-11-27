package com.repuestosya.pedidos.domain.entities;

import com.repuestosya.pedidos.domain.enums.OrderStatus;
import java.time.Instant;
import java.util.List;

/**
 * Patrón Factory: el pedido solo nace de OFFER_ACCEPTED (AGENTS.md §4.3),
 * nunca de un endpoint. El evento trae todo lo necesario (docs/eventos.md),
 * así Pedidos no consulta a Negociación.
 */
public final class OrderFactory {

    private OrderFactory() {}

    public static Order fromOfferAccepted(OfferAcceptedPayload payload, Instant now) {
        Order order =
                new Order(
                        null,
                        payload.offerId(),
                        payload.partRequestId(),
                        payload.buyerId(),
                        payload.supplierId(),
                        payload.supplierName(),
                        payload.partDescription(),
                        payload.vehicleLabel(),
                        payload.price(),
                        payload.currency(),
                        payload.deliveryType(),
                        payload.estimatedDays(),
                        OrderStatus.PENDING_PAYMENT,
                        List.of(OrderStatusHistoryEntry.initial(payload.buyerId(), now)),
                        null,
                        now,
                        now);
        return order;
    }
}
