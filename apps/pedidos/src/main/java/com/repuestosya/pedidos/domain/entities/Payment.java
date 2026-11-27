package com.repuestosya.pedidos.domain.entities;

import com.repuestosya.pedidos.domain.enums.PaymentMethod;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * El pago simulado de un pedido (docs/modelo-datos.md: {@code payments},
 * único por pedido). Nunca lleva datos de tarjeta (AGENTS.md regla 6):
 * solo el método y una referencia generada.
 */
public record Payment(Long id, Long orderId, PaymentMethod method, String reference, BigDecimal amount, Instant paidAt) {}
