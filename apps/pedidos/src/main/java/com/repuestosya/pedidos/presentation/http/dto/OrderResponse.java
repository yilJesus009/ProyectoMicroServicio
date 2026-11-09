package com.repuestosya.pedidos.presentation.http.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.repuestosya.pedidos.domain.entities.Order;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Proyección snake_case del pedido (docs/contratos-api.md). */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record OrderResponse(
        Long id,
        Long offerId,
        Long partRequestId,
        Long buyerId,
        Long supplierId,
        String supplierName,
        String partDescription,
        String vehicleLabel,
        BigDecimal price,
        String currency,
        String deliveryType,
        int estimatedDays,
        String status,
        PaymentResponse payment,
        List<HistoryEntryResponse> history,
        Instant createdAt,
        Instant updatedAt) {

    public static OrderResponse from(Order order) {
        return from(order, null);
    }

    public static OrderResponse from(Order order, PaymentResponse payment) {
        List<HistoryEntryResponse> history =
                order.getHistory().stream()
                        .map(
                                h ->
                                        new HistoryEntryResponse(
                                                h.fromStatus() == null ? null : h.fromStatus().name(),
                                                h.toStatus().name(),
                                                h.changedAt()))
                        .toList();

        return new OrderResponse(
                order.getId(),
                order.getOfferId(),
                order.getPartRequestId(),
                order.getBuyerId(),
                order.getSupplierId(),
                order.getSupplierName(),
                order.getPartDescription(),
                order.getVehicleLabel(),
                order.getPrice(),
                order.getCurrency(),
                order.getDeliveryType().name(),
                order.getEstimatedDays(),
                order.getStatus().name(),
                payment,
                history,
                order.getCreatedAt(),
                order.getUpdatedAt());
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record HistoryEntryResponse(String fromStatus, String toStatus, Instant changedAt) {}

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record PaymentResponse(String method, String reference, Instant paidAt) {}
}
