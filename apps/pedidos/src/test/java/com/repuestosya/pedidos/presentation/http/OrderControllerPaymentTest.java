package com.repuestosya.pedidos.presentation.http;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.repuestosya.pedidos.application.commands.AdvanceOrderStatus;
import com.repuestosya.pedidos.application.commands.ConfirmReceipt;
import com.repuestosya.pedidos.application.commands.PayOrder;
import com.repuestosya.pedidos.application.queries.GetOrderByOfferId;
import com.repuestosya.pedidos.application.queries.GetOrderById;
import com.repuestosya.pedidos.application.queries.ListMyOrders;
import com.repuestosya.pedidos.application.queries.ListSupplierOrders;
import com.repuestosya.pedidos.domain.entities.Order;
import com.repuestosya.pedidos.domain.entities.OrderStatusHistoryEntry;
import com.repuestosya.pedidos.domain.enums.DeliveryType;
import com.repuestosya.pedidos.domain.enums.OrderStatus;
import com.repuestosya.pedidos.domain.enums.PaymentMethod;
import com.repuestosya.pedidos.infrastructure.config.JwtAuthFilter;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Prueba real (MockMvc, sin contexto de Spring) de que el endpoint rechaza
 * cualquier campo que no sea 'method' -- en particular datos de tarjeta
 * (AGENTS.md regla 6). No basta con confiar en que Jackson ignora los
 * campos desconocidos por defecto: esta prueba lo confirma contra el
 * comportamiento real de PaymentRequest.
 */
class OrderControllerPaymentTest {

    private MockMvc mockMvc;
    private PayOrder payOrder;

    @BeforeEach
    void setUp() {
        payOrder = mock(PayOrder.class);
        OrderController controller =
                new OrderController(
                        mock(ListMyOrders.class),
                        mock(ListSupplierOrders.class),
                        mock(GetOrderById.class),
                        mock(GetOrderByOfferId.class),
                        mock(AdvanceOrderStatus.class),
                        mock(ConfirmReceipt.class),
                        payOrder);
        mockMvc =
                MockMvcBuilders.standaloneSetup(controller)
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();
    }

    private static Order newOrder() {
        Instant now = Instant.now();
        return new Order(
                1L, 10L, 20L, 2L, 40L, "AutoParts Center", "Frenos delanteros", "Toyota Corolla 2018",
                new BigDecimal("620"), "BOB", DeliveryType.DELIVERY, 3, OrderStatus.PENDING_PAYMENT,
                List.of(OrderStatusHistoryEntry.initial(2L, now)), null, now, now);
    }

    @Test
    void rechazaDatosDeTarjetaCon400() throws Exception {
        mockMvc.perform(
                        post("/api/v1/orders/1/payment")
                                .requestAttr(JwtAuthFilter.USER_ID_ATTRIBUTE, 2)
                                .requestAttr(JwtAuthFilter.ROL_ATTRIBUTE, "COMPRADOR")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"method\":\"CARD\",\"card_number\":\"4111111111111111\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("card_number")));
    }

    @Test
    void aceptaElBodyNormalSinCamposExtra() throws Exception {
        when(payOrder.execute(eq(1L), eq(PaymentMethod.QR), any(), any())).thenReturn(newOrder());

        mockMvc.perform(
                        post("/api/v1/orders/1/payment")
                                .requestAttr(JwtAuthFilter.USER_ID_ATTRIBUTE, 2)
                                .requestAttr(JwtAuthFilter.ROL_ATTRIBUTE, "COMPRADOR")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"method\":\"QR\"}"))
                .andExpect(status().isOk());
    }
}
