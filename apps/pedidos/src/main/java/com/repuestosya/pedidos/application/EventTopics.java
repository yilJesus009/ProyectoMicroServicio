package com.repuestosya.pedidos.application;

/** Nombres de exchanges y eventos con los que habla este servicio (docs/eventos.md). */
public final class EventTopics {

    private EventTopics() {}

    public static final String PRODUCER = "pedidos";

    public static final String ORDER_EVENTS_EXCHANGE = "order_events";

    public static final String ORDER_CREATED = "ORDER_CREATED";
    public static final String ORDER_STATUS_CHANGED = "ORDER_STATUS_CHANGED";
}
