package com.repuestosya.pedidos.domain.entities;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** El sobre estándar de todo evento (docs/eventos.md), igual para todos los servicios. */
public record EventEnvelope(
        String eventId,
        String eventName,
        int version,
        Instant occurredAt,
        String correlationId,
        String producer,
        Map<String, Object> payload) {

    public static EventEnvelope of(String eventName, String producer, String correlationId, Map<String, Object> payload) {
        return new EventEnvelope(
                UUID.randomUUID().toString(),
                eventName,
                1,
                Instant.now(),
                correlationId != null ? correlationId : UUID.randomUUID().toString(),
                producer,
                payload);
    }
}
