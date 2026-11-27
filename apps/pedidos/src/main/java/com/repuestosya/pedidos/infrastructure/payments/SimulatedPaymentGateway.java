package com.repuestosya.pedidos.infrastructure.payments;

import com.repuestosya.pedidos.application.ports.PaymentGateway;
import com.repuestosya.pedidos.domain.enums.PaymentMethod;
import java.time.Instant;
import org.springframework.stereotype.Component;

/**
 * Adapter: implementación simulada de {@link PaymentGateway}. No llama a
 * ningún proveedor real; siempre "aprueba" y delega en la Strategy de
 * {@link PaymentMethod} para la referencia.
 */
@Component
public class SimulatedPaymentGateway implements PaymentGateway {

    @Override
    public String generateReference(PaymentMethod method, Instant now) {
        return method.buildReference(now);
    }
}
