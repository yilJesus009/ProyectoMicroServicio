package com.repuestosya.pedidos.domain.errors;

/** Datos inválidos o falta un campo (docs/convenciones.md) → 400. */
public class ValidationException extends RuntimeException {
    public ValidationException(String message) {
        super(message);
    }
}
