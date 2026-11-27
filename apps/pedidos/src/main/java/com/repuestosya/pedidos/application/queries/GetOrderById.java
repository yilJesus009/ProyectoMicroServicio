package com.repuestosya.pedidos.application.queries;

import com.repuestosya.pedidos.domain.entities.Order;
import com.repuestosya.pedidos.domain.errors.ForbiddenException;
import com.repuestosya.pedidos.domain.errors.OrderNotFoundException;
import com.repuestosya.pedidos.domain.repositories.OrderRepository;
import org.springframework.stereotype.Component;

/** Query: GET /orders/{id} — solo el comprador o el proveedor del pedido. */
@Component
public class GetOrderById {

    private final OrderRepository orderRepository;

    public GetOrderById(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public Order execute(Long id, Long requesterId) {
        Order order = orderRepository.findById(id).orElseThrow(() -> new OrderNotFoundException(id));
        if (!order.isVisibleTo(requesterId)) {
            throw new ForbiddenException("No puedes ver este pedido");
        }
        return order;
    }
}
