package com.repuestosya.pedidos.infrastructure.persistence;

import com.repuestosya.pedidos.domain.entities.Order;
import com.repuestosya.pedidos.domain.entities.OrderStatusHistoryEntry;
import com.repuestosya.pedidos.domain.entities.Payment;
import java.util.List;

/** Traduce entre la entidad de dominio (pura) y las entidades de JPA. */
final class OrderMapper {

    private OrderMapper() {}

    static Order toDomain(OrderJpaEntity row) {
        List<OrderStatusHistoryEntry> history =
                row.getHistory().stream()
                        .map(
                                h ->
                                        new OrderStatusHistoryEntry(
                                                h.getId(), h.getFromStatus(), h.getToStatus(), h.getChangedBy(), h.getChangedAt()))
                        .toList();

        Payment payment =
                row.getPayment() == null
                        ? null
                        : new Payment(
                                row.getPayment().getId(),
                                row.getId(),
                                row.getPayment().getMethod(),
                                row.getPayment().getReference(),
                                row.getPayment().getAmount(),
                                row.getPayment().getPaidAt());

        return new Order(
                row.getId(),
                row.getOfferId(),
                row.getPartRequestId(),
                row.getBuyerId(),
                row.getSupplierId(),
                row.getSupplierName(),
                row.getPartDescription(),
                row.getVehicleLabel(),
                row.getPrice(),
                row.getCurrency(),
                row.getDeliveryType(),
                row.getEstimatedDays(),
                row.getStatus(),
                history,
                payment,
                row.getCreatedAt(),
                row.getUpdatedAt());
    }

    /** Vuelca el dominio sobre una fila existente (actualiza) o una nueva. */
    static void copyToJpa(Order order, OrderJpaEntity target) {
        target.setOfferId(order.getOfferId());
        target.setPartRequestId(order.getPartRequestId());
        target.setBuyerId(order.getBuyerId());
        target.setSupplierId(order.getSupplierId());
        target.setSupplierName(order.getSupplierName());
        target.setPartDescription(order.getPartDescription());
        target.setVehicleLabel(order.getVehicleLabel());
        target.setPrice(order.getPrice());
        target.setCurrency(order.getCurrency());
        target.setDeliveryType(order.getDeliveryType());
        target.setEstimatedDays(order.getEstimatedDays());
        target.setStatus(order.getStatus());
        target.setCreatedAt(order.getCreatedAt());
        target.setUpdatedAt(order.getUpdatedAt());

        // Solo agrega las filas de historial que todavia no tienen id (las nuevas):
        // las que ya vinieron de la base no se vuelven a insertar.
        for (OrderStatusHistoryEntry entry : order.getHistory()) {
            if (entry.id() == null) {
                target.addHistory(
                        new OrderStatusHistoryJpaEntity(
                                entry.fromStatus(), entry.toStatus(), entry.changedBy(), entry.changedAt()));
            }
        }

        // El pago nunca se actualiza una vez registrado: solo se agrega si es nuevo.
        Payment payment = order.getPayment();
        if (payment != null && target.getPayment() == null) {
            target.attachPayment(
                    new PaymentJpaEntity(payment.method(), payment.reference(), payment.amount(), payment.paidAt()));
        }
    }
}
