package com.repuestosya.pedidos.application.commands;

import com.repuestosya.pedidos.domain.entities.OfferAcceptedPayload;
import com.repuestosya.pedidos.domain.repositories.ProcessedEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

/**
 * Caso de uso: crea el pedido a partir de OFFER_ACCEPTED. Lo llama el
 * consumidor de RabbitMQ (infrastructure/messaging/), que ya validó que
 * el sobre trae {@code event_id}.
 *
 * Idempotente en dos niveles (ajuste del equipo, 2026-11-10):
 *   1. {@code event_id} ya visto en processed_events → no hace nada (el
 *      caso normal: RabbitMQ entrega al menos una vez).
 *   2. Si pese a eso el INSERT choca con el índice único de {@code offer_id}
 *      (mismo pedido, pero con OTRO {@code event_id} — por ejemplo Negociación
 *      reenvió el evento con un id nuevo), NO es un error: ya existe un
 *      pedido para esa oferta. Se marca este event_id como procesado
 *      también (en una transacción nueva, la anterior ya se revirtió) y
 *      se hace ack, sin ir a la dlq.
 */
@Component
public class CreateOrderFromOfferAccepted {

    private static final Logger log = LoggerFactory.getLogger(CreateOrderFromOfferAccepted.class);

    private final OrderCreationTransaction orderCreationTransaction;
    private final ProcessedEventRepository processedEventRepository;

    public CreateOrderFromOfferAccepted(
            OrderCreationTransaction orderCreationTransaction, ProcessedEventRepository processedEventRepository) {
        this.orderCreationTransaction = orderCreationTransaction;
        this.processedEventRepository = processedEventRepository;
    }

    public void execute(OfferAcceptedPayload payload, String eventId, String eventName, String correlationId) {
        if (processedEventRepository.isProcessed(eventId)) {
            return;
        }

        try {
            orderCreationTransaction.createOrderAndPublish(payload, eventId, eventName, correlationId);
        } catch (DataIntegrityViolationException e) {
            if (!isOfferIdConflict(e)) {
                throw e;
            }
            log.info(
                    "offer_id {} ya tiene pedido (event_id distinto, {}): se marca procesado sin crear otro",
                    payload.offerId(),
                    eventId);
            if (!processedEventRepository.isProcessed(eventId)) {
                processedEventRepository.markProcessed(eventId, eventName);
            }
        }
    }

    private static boolean isOfferIdConflict(Throwable error) {
        Throwable cause = error;
        while (cause != null) {
            String message = cause.getMessage();
            if (message != null && message.toLowerCase().contains("uq_orders_offer_id")) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }
}
