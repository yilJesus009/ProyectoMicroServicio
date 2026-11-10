package com.repuestosya.pedidos.domain.errors;

/** Token válido pero sin permiso (rol o dueño incorrecto) → 403. */
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
