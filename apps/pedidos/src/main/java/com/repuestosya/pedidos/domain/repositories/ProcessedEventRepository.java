package com.repuestosya.pedidos.domain.repositories;

/** Registro de eventos ya aplicados (idempotencia, docs/eventos.md). */
public interface ProcessedEventRepository {

    boolean isProcessed(String eventId);

    void markProcessed(String eventId, String eventName);
}
