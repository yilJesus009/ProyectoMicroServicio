package com.repuestosya.pedidos.presentation.http.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.repuestosya.pedidos.domain.errors.ValidationException;

/**
 * Body de POST /orders/{id}/payment. Clase, no record: {@code @JsonAnySetter}
 * necesita un método de instancia. No alcanza con
 * {@code @JsonIgnoreProperties(ignoreUnknown = false)} para garantizar el
 * rechazo (depende de la config global del ObjectMapper); con
 * {@code @JsonAnySetter} que lanza, cualquier campo que no sea
 * {@code method} — en particular datos de tarjeta, AGENTS.md regla 6 —
 * rompe la deserialización sin importar la config.
 */
public class PaymentRequest {

    private String method;

    public String getMethod() {
        return method;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new ValidationException("Campo no permitido en el pago: '" + name + "'. Solo se acepta 'method'.");
    }
}
