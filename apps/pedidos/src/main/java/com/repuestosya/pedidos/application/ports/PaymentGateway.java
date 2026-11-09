package com.repuestosya.pedidos.application.ports;

import com.repuestosya.pedidos.domain.enums.PaymentMethod;
import java.time.Instant;

/**
 * Puerto hacia afuera (AGENTS.md §7): el caso de uso no sabe si detrás hay
 * un gateway simulado o uno real. Hoy lo implementa
 * {@code SimulatedPaymentGateway} (Adapter); el día que haya un gateway de
 * pagos real, se agrega otro adaptador sin tocar application/ ni domain/.
 */
public interface PaymentGateway {

    /** Genera la referencia del pago. En la simulación, siempre "aprueba". */
    String generateReference(PaymentMethod method, Instant now);
}
