package com.repuestosya.pedidos.application.queries;

import com.repuestosya.pedidos.domain.entities.Order;
import com.repuestosya.pedidos.domain.repositories.OrderRepository;
import java.util.List;
import org.springframework.stereotype.Component;

/** Query: GET /orders/supplier — los pedidos del proveedor autenticado. */
@Component
public class ListSupplierOrders {

    private final OrderRepository orderRepository;

    public ListSupplierOrders(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public List<Order> execute(Long supplierId) {
        return orderRepository.findBySupplierId(supplierId);
    }
}
