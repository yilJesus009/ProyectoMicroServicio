package com.repuestosya.pedidos.infrastructure.messaging;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.repuestosya.pedidos.application.commands.CreateOrderFromOfferAccepted;
import com.repuestosya.pedidos.domain.entities.OfferAcceptedPayload;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class OfferAcceptedMessageHandlerTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final CreateOrderFromOfferAccepted command = mock(CreateOrderFromOfferAccepted.class);

    private static final String PAYLOAD_JSON =
            """
            {
              "offer_id": 10,
              "part_request_id": 20,
              "buyer_id": 30,
              "supplier_id": 40,
              "supplier_name": "AutoParts Center",
              "price": "620.00",
              "currency": "BOB",
              "delivery_type": "DELIVERY",
              "estimated_days": 3,
              "part_description": "Frenos delanteros",
              "vehicle_label": "Toyota Corolla 2018"
            }
            """;

    @Test
    void sinEventIdVaDirectoAMalformedSinInvocarElComando() {
        String json =
                """
                {
                  "event_name": "OFFER_ACCEPTED",
                  "correlation_id": "corr-1",
                  "payload": %s
                }
                """
                        .formatted(PAYLOAD_JSON);

        assertThatThrownBy(() -> OfferAcceptedMessageHandler.handle(
                        json.getBytes(StandardCharsets.UTF_8), objectMapper, command))
                .isInstanceOf(MalformedEventException.class);

        verifyNoInteractions(command);
    }

    @Test
    void jsonInvalidoVaAMalformed() {
        byte[] body = "no es json".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> OfferAcceptedMessageHandler.handle(body, objectMapper, command))
                .isInstanceOf(MalformedEventException.class);

        verifyNoInteractions(command);
    }

    @Test
    void eventoValidoLlamaAlComandoConLosDatosParseados() {
        String json =
                """
                {
                  "event_id": "evt-1",
                  "event_name": "OFFER_ACCEPTED",
                  "correlation_id": "corr-1",
                  "payload": %s
                }
                """
                        .formatted(PAYLOAD_JSON);

        OfferAcceptedMessageHandler.handle(json.getBytes(StandardCharsets.UTF_8), objectMapper, command);

        verify(command)
                .execute(
                        eq(new OfferAcceptedPayload(
                                10, 20, 30, 40, "AutoParts Center", new java.math.BigDecimal("620.00"), "BOB",
                                com.repuestosya.pedidos.domain.enums.DeliveryType.DELIVERY, 3, "Frenos delanteros",
                                "Toyota Corolla 2018")),
                        eq("evt-1"),
                        eq("OFFER_ACCEPTED"),
                        eq("corr-1"));
    }
}
