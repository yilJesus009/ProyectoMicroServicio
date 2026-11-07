package com.repuestosya.pedidos.infrastructure.messaging;

import java.util.Map;
import org.springframework.amqp.core.AmqpAdmin;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Deja creada la cola de este servicio al arrancar (docs/eventos.md): cada
 * consumidor tiene su propia cola, con su propio binding, y su propia cola
 * de errores (dlq) colgada del dead-letter exchange `dlx`. Todavia SIN
 * consumidor (@RabbitListener): Pedidos crea el pedido desde OFFER_ACCEPTED
 * a partir de la fase 3; por ahora solo se garantiza que todo existe y esta
 * enlazado para no perder eventos que RabbitMQ ya entrego.
 *
 * Sin un @RabbitListener, el RabbitAdmin de Spring AMQP NO abre conexion
 * sola (declara perezosamente, recien cuando algo mas usa la conexion): el
 * ApplicationRunner de abajo fuerza la declaracion al arrancar, en vez de
 * esperar a la fase 3.
 */
@Configuration
public class RabbitMqConfig {

    public static final String OFFER_EVENTS_EXCHANGE = "offer_events";
    public static final String OFFER_ACCEPTED_QUEUE = "pedidos.offer_accepted";
    public static final String OFFER_ACCEPTED_ROUTING_KEY = "OFFER_ACCEPTED";

    public static final String DLX_EXCHANGE = "dlx";
    public static final String OFFER_ACCEPTED_DLQ = "pedidos.offer_accepted.dlq";

    @Bean
    public TopicExchange offerEventsExchange() {
        return new TopicExchange(OFFER_EVENTS_EXCHANGE, true, false);
    }

    @Bean
    public DirectExchange dlxExchange() {
        return new DirectExchange(DLX_EXCHANGE, true, false);
    }

    /**
     * Cola de errores (docs/eventos.md §4): recibe lo que `nack` sin
     * reencolar en la cola principal.
     */
    @Bean
    public Queue offerAcceptedDlq() {
        return QueueBuilder.durable(OFFER_ACCEPTED_DLQ).build();
    }

    @Bean
    public Binding offerAcceptedDlqBinding(Queue offerAcceptedDlq, DirectExchange dlxExchange) {
        return BindingBuilder.bind(offerAcceptedDlq).to(dlxExchange).with(OFFER_ACCEPTED_DLQ);
    }

    /**
     * Cola principal con dead-lettering hacia `dlx`: un `nack(requeue=false)`
     * aquí termina en {@link #OFFER_ACCEPTED_DLQ}, no se pierde.
     */
    @Bean
    public Queue offerAcceptedQueue() {
        return QueueBuilder.durable(OFFER_ACCEPTED_QUEUE)
                .withArguments(
                        Map.of(
                                "x-dead-letter-exchange", DLX_EXCHANGE,
                                "x-dead-letter-routing-key", OFFER_ACCEPTED_DLQ))
                .build();
    }

    @Bean
    public Binding offerAcceptedBinding(Queue offerAcceptedQueue, TopicExchange offerEventsExchange) {
        return BindingBuilder.bind(offerAcceptedQueue)
                .to(offerEventsExchange)
                .with(OFFER_ACCEPTED_ROUTING_KEY);
    }

    @Bean
    public ApplicationRunner declareOfferAcceptedQueueOnStartup(
            AmqpAdmin admin,
            TopicExchange offerEventsExchange,
            DirectExchange dlxExchange,
            Queue offerAcceptedDlq,
            Binding offerAcceptedDlqBinding,
            Queue offerAcceptedQueue,
            Binding offerAcceptedBinding) {
        return (ApplicationArguments args) -> {
            admin.declareExchange(offerEventsExchange);
            admin.declareExchange(dlxExchange);
            admin.declareQueue(offerAcceptedDlq);
            admin.declareBinding(offerAcceptedDlqBinding);
            admin.declareQueue(offerAcceptedQueue);
            admin.declareBinding(offerAcceptedBinding);
        };
    }
}
