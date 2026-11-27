package com.repuestosya.pedidos.domain.errors;

public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(Long id) {
        super("El pedido " + id + " no existe");
    }
}
