package com.repuestosya.pedidos.application.commands;

import com.repuestosya.pedidos.domain.entities.Order;
import com.repuestosya.pedidos.domain.enums.OrderStatus;
import java.util.LinkedHashMap;
import java.util.Map;

/** Payloads de ORDER_CREATED y ORDER_STATUS_CHANGED (docs/eventos.md), armados a mano. */
final class OrderEventPayloads {

    private OrderEventPayloads() {}

    static Map<String, Object> created(Order order) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("order_id", order.getId());
        payload.put("offer_id", order.getOfferId());
        payload.put("part_request_id", order.getPartRequestId());
        payload.put("buyer_id", order.getBuyerId());
        payload.put("supplier_id", order.getSupplierId());
        payload.put("total", order.getPrice());
        payload.put("currency", order.getCurrency());
        payload.put("status", order.getStatus().name());
        return payload;
    }

    static Map<String, Object> statusChanged(Order order, OrderStatus previousStatus, Long changedBy) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("order_id", order.getId());
        payload.put("part_request_id", order.getPartRequestId());
        payload.put("buyer_id", order.getBuyerId());
        payload.put("supplier_id", order.getSupplierId());
        payload.put("previous_status", previousStatus.name());
        payload.put("new_status", order.getStatus().name());
        payload.put("changed_by", changedBy);
        return payload;
    }
}
