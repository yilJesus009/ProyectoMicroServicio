package com.repuestosya.pedidos.domain.repositories;

import com.repuestosya.pedidos.domain.entities.Order;
import java.util.List;
import java.util.Optional;

/**
 * Contrato del repositorio. Interfaz, NO implementación: el dominio no
 * sabe que hay JPA detrás. La implementación vive en infrastructure/persistence/.
 */
public interface OrderRepository {

    Order save(Order order);

    Optional<Order> findById(Long id);

    Optional<Order> findByOfferId(Long offerId);

    List<Order> findByBuyerId(Long buyerId);

    List<Order> findBySupplierId(Long supplierId);
}
