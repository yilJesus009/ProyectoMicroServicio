package com.repuestosya.pedidos.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.repuestosya.pedidos.infrastructure.messaging.RabbitMqConfig;
import org.junit.jupiter.api.Test;

class RabbitMqConfigTest {

    private final RabbitMqConfig config = new RabbitMqConfig();

    @Test
    void laColaEsDuradera() {
        assertThat(config.offerAcceptedQueue().getName()).isEqualTo("pedidos.offer_accepted");
        assertThat(config.offerAcceptedQueue().isDurable()).isTrue();
    }

    @Test
    void elExchangeEsTopicYDurable() {
        assertThat(config.offerEventsExchange().getName()).isEqualTo("offer_events");
        assertThat(config.offerEventsExchange().getType()).isEqualTo("topic");
        assertThat(config.offerEventsExchange().isDurable()).isTrue();
    }

    @Test
    void elBindingUsaLaRoutingKeyOfferAccepted() {
        var binding =
                config.offerAcceptedBinding(config.offerAcceptedQueue(), config.offerEventsExchange());

        assertThat(binding.getRoutingKey()).isEqualTo("OFFER_ACCEPTED");
        assertThat(binding.getExchange()).isEqualTo("offer_events");
        assertThat(binding.getDestination()).isEqualTo("pedidos.offer_accepted");
    }
}
