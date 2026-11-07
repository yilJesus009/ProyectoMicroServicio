package com.repuestosya.pedidos.infrastructure.messaging;

import org.springframework.amqp.core.AmqpAdmin;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Deja creada la cola de este servicio al arrancar (docs/eventos.md): cada
 * consumidor tiene su propia cola, con su propio binding. Todavia SIN
 * consumidor (@RabbitListener): Pedidos crea el pedido desde OFFER_ACCEPTED
 * a partir de la fase 3; por ahora solo se garantiza que la cola existe y
 * esta enlazada para no perder eventos que RabbitMQ ya entrego.
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

    @Bean
    public TopicExchange offerEventsExchange() {
        return new TopicExchange(OFFER_EVENTS_EXCHANGE, true, false);
    }

    @Bean
    public Queue offerAcceptedQueue() {
        return new Queue(OFFER_ACCEPTED_QUEUE, true);
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
            Queue offerAcceptedQueue,
            Binding offerAcceptedBinding) {
        return (ApplicationArguments args) -> {
            admin.declareExchange(offerEventsExchange);
            admin.declareQueue(offerAcceptedQueue);
            admin.declareBinding(offerAcceptedBinding);
        };
    }
}
