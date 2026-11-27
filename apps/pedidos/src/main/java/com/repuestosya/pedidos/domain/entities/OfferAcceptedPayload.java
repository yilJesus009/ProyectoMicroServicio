package com.repuestosya.pedidos.domain.entities;

import com.repuestosya.pedidos.domain.enums.DeliveryType;
import java.math.BigDecimal;

/**
 * El payload de OFFER_ACCEPTED (docs/eventos.md), ya convertido a tipos de
 * dominio. El parseo del JSON crudo vive en infrastructure/messaging/
 * (este record no conoce Jackson — AGENTS.md §7).
 */
public record OfferAcceptedPayload(
        long offerId,
        long partRequestId,
        long buyerId,
        long supplierId,
        String supplierName,
        BigDecimal price,
        String currency,
        DeliveryType deliveryType,
        int estimatedDays,
        String partDescription,
        String vehicleLabel) {}
