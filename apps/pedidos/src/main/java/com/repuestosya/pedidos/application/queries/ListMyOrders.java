package com.repuestosya.pedidos.application.queries;

import com.repuestosya.pedidos.domain.entities.Order;
import com.repuestosya.pedidos.domain.repositories.OrderRepository;
import java.util.List;
import org.springframework.stereotype.Component;

/** Query: GET /orders/mine — los pedidos del comprador autenticado. */
@Component
public class ListMyOrders {

    private final OrderRepository orderRepository;

    public ListMyOrders(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public List<Order> execute(Long buyerId) {
        return orderRepository.findByBuyerId(buyerId);
    }
}
