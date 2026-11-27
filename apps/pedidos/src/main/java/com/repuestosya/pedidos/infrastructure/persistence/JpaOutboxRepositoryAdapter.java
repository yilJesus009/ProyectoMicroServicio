package com.repuestosya.pedidos.infrastructure.persistence;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.repuestosya.pedidos.domain.entities.EventEnvelope;
import com.repuestosya.pedidos.domain.repositories.OutboxRepository;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Repository;

/** Implementación JPA/PostgreSQL del contrato OutboxRepository (docs/eventos.md). */
@Repository
public class JpaOutboxRepositoryAdapter implements OutboxRepository {

    private final OutboxEventJpaRepository jpaRepository;
    private final ObjectMapper objectMapper;

    public JpaOutboxRepositoryAdapter(OutboxEventJpaRepository jpaRepository, ObjectMapper objectMapper) {
        this.jpaRepository = jpaRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void enqueue(EventEnvelope envelope, String exchange, String routingKey) {
        try {
            String payloadJson = objectMapper.writeValueAsString(toJsonMap(envelope));
            jpaRepository.save(
                    new OutboxEventJpaEntity(
                            UUID.fromString(envelope.eventId()), exchange, routingKey, payloadJson, Instant.now()));
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo serializar el evento " + envelope.eventName(), e);
        }
    }

    /**
     * El dominio no conoce Jackson (AGENTS.md §7): el sobre en snake_case
     * (docs/eventos.md) se arma acá, a mano, no con una anotación en el record.
     */
    private static Map<String, Object> toJsonMap(EventEnvelope envelope) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("event_id", envelope.eventId());
        map.put("event_name", envelope.eventName());
        map.put("version", envelope.version());
        map.put("occurred_at", envelope.occurredAt().toString());
        map.put("correlation_id", envelope.correlationId());
        map.put("producer", envelope.producer());
        map.put("payload", envelope.payload());
        return map;
    }

    @Override
    public List<PendingEvent> findUnpublished(int limit) {
        return jpaRepository.findByPublishedAtIsNullOrderByCreatedAtAsc(Limit.of(limit)).stream()
                .map(row -> new PendingEvent(row.getId(), row.getExchange(), row.getRoutingKey(), row.getPayload()))
                .toList();
    }

    @Override
    public void markPublished(UUID id) {
        jpaRepository
                .findById(id)
                .ifPresent(
                        row -> {
                            row.setPublishedAt(Instant.now());
                            jpaRepository.save(row);
                        });
    }

    @Override
    public void incrementAttempts(UUID id) {
        jpaRepository
                .findById(id)
                .ifPresent(
                        row -> {
                            row.setAttempts(row.getAttempts() + 1);
                            jpaRepository.save(row);
                        });
    }
}
