package com.repuestosya.pedidos.infrastructure.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.repuestosya.pedidos.application.commands.CreateOrderFromOfferAccepted;
import com.repuestosya.pedidos.domain.entities.OfferAcceptedPayload;
import com.repuestosya.pedidos.domain.enums.DeliveryType;
import java.math.BigDecimal;

/**
 * Decide qué hacer con un mensaje crudo de OFFER_ACCEPTED, sin tocar
 * Spring AMQP: facilita probar la regla "sin event_id no se procesa" sin
 * un broker real (mismo patrón que negociacion/notificaciones en Node).
 *
 * Sin {@code event_id} → {@link MalformedEventException} directo, sin
 * siquiera parsear el payload.
 */
public final class OfferAcceptedMessageHandler {

    private OfferAcceptedMessageHandler() {}

    public static void handle(byte[] body, ObjectMapper objectMapper, CreateOrderFromOfferAccepted command) {
        JsonNode envelope;
        try {
            envelope = objectMapper.readTree(body);
        } catch (Exception e) {
            throw new MalformedEventException("mensaje no es JSON válido: " + e.getMessage(), e);
        }

        JsonNode eventIdNode = envelope.get("event_id");
        if (eventIdNode == null || eventIdNode.isNull() || eventIdNode.asText().isBlank()) {
            throw new MalformedEventException(
                    "evento sin event_id (" + textOrNull(envelope.get("event_name")) + ")");
        }

        String eventId = eventIdNode.asText();
        String eventName = textOrNull(envelope.get("event_name"));
        String correlationId = textOrNull(envelope.get("correlation_id"));
        OfferAcceptedPayload payload = parsePayload(envelope.get("payload"));

        command.execute(payload, eventId, eventName, correlationId);
    }

    private static OfferAcceptedPayload parsePayload(JsonNode payload) {
        if (payload == null || payload.isNull()) {
            throw new MalformedEventException("OFFER_ACCEPTED sin payload");
        }
        return new OfferAcceptedPayload(
                payload.get("offer_id").asLong(),
                payload.get("part_request_id").asLong(),
                payload.get("buyer_id").asLong(),
                payload.get("supplier_id").asLong(),
                payload.get("supplier_name").asText(),
                new BigDecimal(payload.get("price").asText()),
                payload.get("currency").asText(),
                DeliveryType.valueOf(payload.get("delivery_type").asText()),
                payload.get("estimated_days").asInt(),
                payload.get("part_description").asText(),
                payload.get("vehicle_label").asText());
    }

    private static String textOrNull(JsonNode node) {
        return node == null || node.isNull() ? null : node.asText();
    }
}
