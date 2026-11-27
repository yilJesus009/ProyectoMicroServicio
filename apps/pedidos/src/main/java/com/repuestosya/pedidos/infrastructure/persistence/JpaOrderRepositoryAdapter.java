package com.repuestosya.pedidos.infrastructure.persistence;

import com.repuestosya.pedidos.domain.entities.Order;
import com.repuestosya.pedidos.domain.repositories.OrderRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

/** Implementación JPA/PostgreSQL del contrato OrderRepository. */
@Repository
public class JpaOrderRepositoryAdapter implements OrderRepository {

    private final OrderJpaRepository jpaRepository;

    public JpaOrderRepositoryAdapter(OrderJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Order save(Order order) {
        OrderJpaEntity entity =
                order.getId() == null
                        ? new OrderJpaEntity()
                        : jpaRepository
                                .findById(order.getId())
                                .orElseThrow(
                                        () -> new IllegalStateException("El pedido " + order.getId() + " no existe para actualizar"));

        OrderMapper.copyToJpa(order, entity);
        OrderJpaEntity saved = jpaRepository.save(entity);
        return OrderMapper.toDomain(saved);
    }

    @Override
    public Optional<Order> findById(Long id) {
        return jpaRepository.findById(id).map(OrderMapper::toDomain);
    }

    @Override
    public Optional<Order> findByOfferId(Long offerId) {
        return jpaRepository.findByOfferId(offerId).map(OrderMapper::toDomain);
    }

    @Override
    public List<Order> findByBuyerId(Long buyerId) {
        return jpaRepository.findByBuyerIdOrderByCreatedAtDesc(buyerId).stream().map(OrderMapper::toDomain).toList();
    }

    @Override
    public List<Order> findBySupplierId(Long supplierId) {
        return jpaRepository.findBySupplierIdOrderByCreatedAtDesc(supplierId).stream()
                .map(OrderMapper::toDomain)
                .toList();
    }
}
