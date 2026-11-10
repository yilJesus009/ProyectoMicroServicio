package com.repuestosya.pedidos.domain.enums;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class PaymentMethodTest {

    private static final String REFERENCE_PATTERN = "PAY-\\d{8}-\\d{6}";

    @Test
    void qrGeneraLaReferenciaConElFormatoEsperado() {
        String reference = PaymentMethod.QR.buildReference(Instant.now());

        assertThat(reference).matches(REFERENCE_PATTERN);
    }

    @Test
    void cardGeneraLaReferenciaConElFormatoEsperado() {
        String reference = PaymentMethod.CARD.buildReference(Instant.now());

        assertThat(reference).matches(REFERENCE_PATTERN);
    }

    @Test
    void laFechaDeLaReferenciaCoincideConLaFechaDada() {
        Instant now = Instant.parse("2026-11-10T14:35:12Z");

        assertThat(PaymentMethod.QR.buildReference(now)).startsWith("PAY-20261110-");
    }
}
