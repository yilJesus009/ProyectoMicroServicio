package com.repuestosya.pedidos.domain.errors;

import com.repuestosya.pedidos.domain.enums.OrderStatus;

/** Transición de estado no permitida (docs/flujo-principal.md) → 422. */
public class InvalidOrderTransitionException extends RuntimeException {
    public InvalidOrderTransitionException(OrderStatus from, OrderStatus to) {
        super("Transición de estado no permitida: " + from + " → " + to);
    }

    public InvalidOrderTransitionException(String message) {
        super(message);
    }
}
