package com.repuestosya.pedidos.infrastructure.persistence;

import com.repuestosya.pedidos.domain.repositories.ProcessedEventRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Repository;

/** Implementación JPA/PostgreSQL del contrato ProcessedEventRepository. */
@Repository
public class JpaProcessedEventRepositoryAdapter implements ProcessedEventRepository {

    private final ProcessedEventJpaRepository jpaRepository;

    public JpaProcessedEventRepositoryAdapter(ProcessedEventJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public boolean isProcessed(String eventId) {
        return jpaRepository.existsById(UUID.fromString(eventId));
    }

    @Override
    public void markProcessed(String eventId, String eventName) {
        jpaRepository.save(new ProcessedEventJpaEntity(UUID.fromString(eventId), eventName, Instant.now()));
    }
}
