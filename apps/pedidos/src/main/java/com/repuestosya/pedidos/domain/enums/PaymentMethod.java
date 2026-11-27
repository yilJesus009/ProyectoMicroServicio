package com.repuestosya.pedidos.domain.enums;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * Patrón Strategy: cada método de pago genera su propia referencia
 * simulada (docs/plan/fase-3.md: {@code PAY-AAAAMMDD-NNNNNN}). Hoy las dos
 * ramas usan el mismo formato, pero cada una es el punto de extensión si
 * QR o CARD necesitan cambiar su forma de generar la referencia más
 * adelante (por ejemplo, al conectar un gateway real).
 */
public enum PaymentMethod {
    QR {
        @Override
        public String buildReference(Instant now) {
            return formatReference(now);
        }
    },
    CARD {
        @Override
        public String buildReference(Instant now) {
            return formatReference(now);
        }
    };

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final SecureRandom RANDOM = new SecureRandom();

    public abstract String buildReference(Instant now);

    protected static String formatReference(Instant now) {
        String datePart = DATE_FORMAT.format(now.atZone(ZoneOffset.UTC));
        int sequence = RANDOM.nextInt(1_000_000);
        return "PAY-" + datePart + "-" + String.format("%06d", sequence);
    }
}
