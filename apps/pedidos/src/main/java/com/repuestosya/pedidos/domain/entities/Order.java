package com.repuestosya.pedidos.domain.entities;

import com.repuestosya.pedidos.domain.enums.DeliveryType;
import com.repuestosya.pedidos.domain.enums.OrderStatus;
import com.repuestosya.pedidos.domain.errors.InvalidOrderTransitionException;
import com.repuestosya.pedidos.domain.errors.PaymentAlreadyExistsException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidad de dominio. Sin anotaciones de JPA (AGENTS.md §7): la mapea
 * infrastructure/persistence/OrderMapper.java hacia/desde OrderJpaEntity.
 */
public class Order {
    private Long id;
    private final Long offerId;
    private final Long partRequestId;
    private final Long buyerId;
    private final Long supplierId;
    private final String supplierName;
    private final String partDescription;
    private final String vehicleLabel;
    private final BigDecimal price;
    private final String currency;
    private final DeliveryType deliveryType;
    private final int estimatedDays;
    private OrderStatus status;
    private final List<OrderStatusHistoryEntry> history;
    private Payment payment;
    private Instant createdAt;
    private Instant updatedAt;

    public Order(
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
            DeliveryType deliveryType,
            int estimatedDays,
            OrderStatus status,
            List<OrderStatusHistoryEntry> history,
            Payment payment,
            Instant createdAt,
            Instant updatedAt) {
        this.id = id;
        this.offerId = offerId;
        this.partRequestId = partRequestId;
        this.buyerId = buyerId;
        this.supplierId = supplierId;
        this.supplierName = supplierName;
        this.partDescription = partDescription;
        this.vehicleLabel = vehicleLabel;
        this.price = price;
        this.currency = currency;
        this.deliveryType = deliveryType;
        this.estimatedDays = estimatedDays;
        this.status = status;
        this.history = new ArrayList<>(history);
        this.payment = payment;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    /**
     * Cambia el estado aplicando State + Strategy ({@link OrderStatus#allowedNext}),
     * y agrega la fila al historial. No decide quién puede hacerlo ni
     * cuándo (eso vive en application/, que conoce el rol y el dueño).
     *
     * @throws InvalidOrderTransitionException si la transición no es legal
     */
    public void changeStatus(OrderStatus target, Long changedBy, Instant changedAt) {
        if (!status.canTransitionTo(target, deliveryType)) {
            throw new InvalidOrderTransitionException(status, target);
        }
        OrderStatus previous = status;
        this.status = target;
        this.updatedAt = changedAt;
        this.history.add(OrderStatusHistoryEntry.of(previous, target, changedBy, changedAt));
    }

    /**
     * Registra el pago simulado y pasa a PREPARING. El orden importa (igual
     * que en Negociación con la segunda aceptación): primero se pregunta si
     * YA hay un pago (409, "segundo pago") y recién después se valida el
     * estado con {@link #changeStatus} (422 si no estaba en PENDING_PAYMENT).
     *
     * @throws PaymentAlreadyExistsException si el pedido ya tiene un pago
     * @throws InvalidOrderTransitionException si el pedido no estaba en PENDING_PAYMENT
     */
    public void registerPayment(Payment payment, Long changedBy, Instant changedAt) {
        if (this.payment != null) {
            throw new PaymentAlreadyExistsException(id);
        }
        changeStatus(OrderStatus.PREPARING, changedBy, changedAt);
        this.payment = payment;
    }

    public boolean isOwnedByBuyer(Long userId) {
        return buyerId.equals(userId);
    }

    public boolean isOwnedBySupplier(Long userId) {
        return supplierId.equals(userId);
    }

    public boolean isVisibleTo(Long userId) {
        return isOwnedByBuyer(userId) || isOwnedBySupplier(userId);
    }

    public void assignId(Long id) {
        this.id = id;
    }

    public Long getId() {
        return id;
    }

    public Long getOfferId() {
        return offerId;
    }

    public Long getPartRequestId() {
        return partRequestId;
    }

    public Long getBuyerId() {
        return buyerId;
    }

    public Long getSupplierId() {
        return supplierId;
    }

    public String getSupplierName() {
        return supplierName;
    }

    public String getPartDescription() {
        return partDescription;
    }

    public String getVehicleLabel() {
        return vehicleLabel;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public String getCurrency() {
        return currency;
    }

    public DeliveryType getDeliveryType() {
        return deliveryType;
    }

    public int getEstimatedDays() {
        return estimatedDays;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public List<OrderStatusHistoryEntry> getHistory() {
        return List.copyOf(history);
    }

    public Payment getPayment() {
        return payment;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
