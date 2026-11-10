package com.repuestosya.pedidos.application.queries;

import com.repuestosya.pedidos.domain.entities.Order;
import com.repuestosya.pedidos.domain.errors.OrderNotFoundException;
import com.repuestosya.pedidos.domain.repositories.OrderRepository;
import org.springframework.stereotype.Component;

/**
 * Query: GET /orders/by-offer/{offerId} — el frontend reintenta cada 2 s
 * hasta que el pedido exista (docs/contratos-api.md). 404 tanto si todavía
 * no se creó como si el pedido es de otro comprador (no se revela que
 * existe).
 */
@Component
public class GetOrderByOfferId {

    private final OrderRepository orderRepository;

    public GetOrderByOfferId(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public Order execute(Long offerId, Long requesterId) {
        Order order =
                orderRepository
                        .findByOfferId(offerId)
                        .filter(o -> o.isOwnedByBuyer(requesterId))
                        .orElse(null);
        if (order == null) {
            throw new OrderNotFoundException(offerId);
        }
        return order;
    }
}
