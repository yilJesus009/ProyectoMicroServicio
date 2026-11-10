package com.repuestosya.pedidos.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderJpaRepository extends JpaRepository<OrderJpaEntity, Long> {

    Optional<OrderJpaEntity> findByOfferId(Long offerId);

    List<OrderJpaEntity> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);

    List<OrderJpaEntity> findBySupplierIdOrderByCreatedAtDesc(Long supplierId);
}
