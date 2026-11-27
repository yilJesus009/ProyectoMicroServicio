package com.repuestosya.pedidos.domain.errors;

/** Ya existe un pago registrado para este pedido → 409. */
public class PaymentAlreadyExistsException extends RuntimeException {
    public PaymentAlreadyExistsException(Long orderId) {
        super("El pedido " + orderId + " ya tiene un pago registrado");
    }
}
