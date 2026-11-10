package com.repuestosya.pedidos.infrastructure.persistence;

import com.repuestosya.pedidos.domain.enums.DeliveryType;
import com.repuestosya.pedidos.domain.enums.OrderStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidad JPA. Vive solo en infrastructure/: el dominio (domain/entities/Order.java)
 * no conoce JPA (AGENTS.md §7). OrderMapper traduce entre las dos.
 */
@Entity
@Table(name = "orders")
public class OrderJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "offer_id", nullable = false, unique = true)
    private Long offerId;

    @Column(name = "part_request_id", nullable = false)
    private Long partRequestId;

    @Column(name = "buyer_id", nullable = false)
    private Long buyerId;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "supplier_name", nullable = false)
    private String supplierName;

    @Column(name = "part_description", nullable = false, columnDefinition = "text")
    private String partDescription;

    @Column(name = "vehicle_label", nullable = false)
    private String vehicleLabel;

    @Column(name = "price", nullable = false)
    private BigDecimal price;

    @Column(name = "currency", nullable = false)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_type", nullable = false)
    private DeliveryType deliveryType;

    @Column(name = "estimated_days", nullable = false)
    private int estimatedDays;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private OrderStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("changedAt ASC")
    private List<OrderStatusHistoryJpaEntity> history = new ArrayList<>();

    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private PaymentJpaEntity payment;

    protected OrderJpaEntity() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getOfferId() {
        return offerId;
    }

    public void setOfferId(Long offerId) {
        this.offerId = offerId;
    }

    public Long getPartRequestId() {
        return partRequestId;
    }

    public void setPartRequestId(Long partRequestId) {
        this.partRequestId = partRequestId;
    }

    public Long getBuyerId() {
        return buyerId;
    }

    public void setBuyerId(Long buyerId) {
        this.buyerId = buyerId;
    }

    public Long getSupplierId() {
        return supplierId;
    }

    public void setSupplierId(Long supplierId) {
        this.supplierId = supplierId;
    }

    public String getSupplierName() {
        return supplierName;
    }

    public void setSupplierName(String supplierName) {
        this.supplierName = supplierName;
    }

    public String getPartDescription() {
        return partDescription;
    }

    public void setPartDescription(String partDescription) {
        this.partDescription = partDescription;
    }

    public String getVehicleLabel() {
        return vehicleLabel;
    }

    public void setVehicleLabel(String vehicleLabel) {
        this.vehicleLabel = vehicleLabel;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public DeliveryType getDeliveryType() {
        return deliveryType;
    }

    public void setDeliveryType(DeliveryType deliveryType) {
        this.deliveryType = deliveryType;
    }

    public int getEstimatedDays() {
        return estimatedDays;
    }

    public void setEstimatedDays(int estimatedDays) {
        this.estimatedDays = estimatedDays;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<OrderStatusHistoryJpaEntity> getHistory() {
        return history;
    }

    public void addHistory(OrderStatusHistoryJpaEntity entry) {
        entry.setOrder(this);
        history.add(entry);
    }

    public PaymentJpaEntity getPayment() {
        return payment;
    }

    public void attachPayment(PaymentJpaEntity payment) {
        payment.setOrder(this);
        this.payment = payment;
    }
}
