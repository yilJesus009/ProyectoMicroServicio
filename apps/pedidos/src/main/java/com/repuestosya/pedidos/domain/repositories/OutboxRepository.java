package com.repuestosya.pedidos.domain.repositories;

import com.repuestosya.pedidos.domain.entities.EventEnvelope;
import java.util.List;
import java.util.UUID;

/**
 * Contrato del outbox (docs/eventos.md). El caso de uso no sabe que hay
 * JPA ni RabbitMQ detrás; la implementación vive en infrastructure/.
 */
public interface OutboxRepository {

    /**
     * Encola un evento para publicar después. Debe llamarse dentro de la
     * MISMA transacción que el cambio de negocio: si se revierte, el
     * evento tampoco queda guardado.
     */
    void enqueue(EventEnvelope envelope, String exchange, String routingKey);

    /** Pendientes (published_at IS NULL), en orden de creación. */
    List<PendingEvent> findUnpublished(int limit);

    void markPublished(UUID id);

    void incrementAttempts(UUID id);

    record PendingEvent(UUID id, String exchange, String routingKey, String payloadJson) {}
}
