package com.repuestosya.pedidos.presentation.http;

import com.repuestosya.pedidos.application.commands.AdvanceOrderStatus;
import com.repuestosya.pedidos.application.commands.ConfirmReceipt;
import com.repuestosya.pedidos.application.commands.PayOrder;
import com.repuestosya.pedidos.application.queries.GetOrderByOfferId;
import com.repuestosya.pedidos.application.queries.GetOrderById;
import com.repuestosya.pedidos.application.queries.ListMyOrders;
import com.repuestosya.pedidos.application.queries.ListSupplierOrders;
import com.repuestosya.pedidos.domain.entities.Order;
import com.repuestosya.pedidos.domain.enums.OrderStatus;
import com.repuestosya.pedidos.domain.enums.PaymentMethod;
import com.repuestosya.pedidos.domain.errors.ForbiddenException;
import com.repuestosya.pedidos.domain.errors.ValidationException;
import com.repuestosya.pedidos.infrastructure.config.JwtAuthFilter;
import com.repuestosya.pedidos.presentation.http.dto.ChangeStatusRequest;
import com.repuestosya.pedidos.presentation.http.dto.OrderResponse;
import com.repuestosya.pedidos.presentation.http.dto.PaymentRequest;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Controller delgado (AGENTS.md §5): valida → llama el caso de uso → responde. */
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final ListMyOrders listMyOrders;
    private final ListSupplierOrders listSupplierOrders;
    private final GetOrderById getOrderById;
    private final GetOrderByOfferId getOrderByOfferId;
    private final AdvanceOrderStatus advanceOrderStatus;
    private final ConfirmReceipt confirmReceipt;
    private final PayOrder payOrder;

    public OrderController(
            ListMyOrders listMyOrders,
            ListSupplierOrders listSupplierOrders,
            GetOrderById getOrderById,
            GetOrderByOfferId getOrderByOfferId,
            AdvanceOrderStatus advanceOrderStatus,
            ConfirmReceipt confirmReceipt,
            PayOrder payOrder) {
        this.listMyOrders = listMyOrders;
        this.listSupplierOrders = listSupplierOrders;
        this.getOrderById = getOrderById;
        this.getOrderByOfferId = getOrderByOfferId;
        this.advanceOrderStatus = advanceOrderStatus;
        this.confirmReceipt = confirmReceipt;
        this.payOrder = payOrder;
    }

    @GetMapping("/mine")
    public ApiResponse<List<OrderResponse>> mine(
            @RequestAttribute(JwtAuthFilter.USER_ID_ATTRIBUTE) Number userId,
            @RequestAttribute(JwtAuthFilter.ROL_ATTRIBUTE) String rol) {
        requireRole(rol, "COMPRADOR");
        List<OrderResponse> data = listMyOrders.execute(userId.longValue()).stream().map(OrderResponse::from).toList();
        return ApiResponse.ok(data, "Pedidos encontrados");
    }

    @GetMapping("/supplier")
    public ApiResponse<List<OrderResponse>> supplier(
            @RequestAttribute(JwtAuthFilter.USER_ID_ATTRIBUTE) Number userId,
            @RequestAttribute(JwtAuthFilter.ROL_ATTRIBUTE) String rol) {
        requireRole(rol, "PROVEEDOR");
        List<OrderResponse> data =
                listSupplierOrders.execute(userId.longValue()).stream().map(OrderResponse::from).toList();
        return ApiResponse.ok(data, "Pedidos encontrados");
    }

    @GetMapping("/{id}")
    public ApiResponse<OrderResponse> byId(
            @PathVariable Long id, @RequestAttribute(JwtAuthFilter.USER_ID_ATTRIBUTE) Number userId) {
        Order order = getOrderById.execute(id, userId.longValue());
        return ApiResponse.ok(OrderResponse.from(order), "Pedido encontrado");
    }

    @GetMapping("/by-offer/{offerId}")
    public ApiResponse<OrderResponse> byOfferId(
            @PathVariable Long offerId,
            @RequestAttribute(JwtAuthFilter.USER_ID_ATTRIBUTE) Number userId,
            @RequestAttribute(JwtAuthFilter.ROL_ATTRIBUTE) String rol) {
        requireRole(rol, "COMPRADOR");
        Order order = getOrderByOfferId.execute(offerId, userId.longValue());
        return ApiResponse.ok(OrderResponse.from(order), "Pedido encontrado");
    }

    @PostMapping("/{id}/payment")
    public ApiResponse<OrderResponse> pay(
            @PathVariable Long id,
            @RequestBody PaymentRequest body,
            @RequestAttribute(JwtAuthFilter.USER_ID_ATTRIBUTE) Number userId,
            @RequestAttribute(JwtAuthFilter.ROL_ATTRIBUTE) String rol,
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId) {
        requireRole(rol, "COMPRADOR");
        PaymentMethod method = parseMethod(body.getMethod());
        Order order = payOrder.execute(id, method, userId.longValue(), correlationId);
        return ApiResponse.ok(OrderResponse.from(order), "Pago registrado");
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<OrderResponse> changeStatus(
            @PathVariable Long id,
            @RequestBody ChangeStatusRequest body,
            @RequestAttribute(JwtAuthFilter.USER_ID_ATTRIBUTE) Number userId,
            @RequestAttribute(JwtAuthFilter.ROL_ATTRIBUTE) String rol,
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId) {
        requireRole(rol, "PROVEEDOR");
        OrderStatus target = parseStatus(body.status());
        Order order = advanceOrderStatus.execute(id, target, userId.longValue(), correlationId);
        return ApiResponse.ok(OrderResponse.from(order), "Estado actualizado");
    }

    @PostMapping("/{id}/confirm-receipt")
    public ApiResponse<OrderResponse> confirmReceipt(
            @PathVariable Long id,
            @RequestAttribute(JwtAuthFilter.USER_ID_ATTRIBUTE) Number userId,
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId) {
        Order order = confirmReceipt.execute(id, userId.longValue(), correlationId);
        return ApiResponse.ok(OrderResponse.from(order), "Recepción confirmada");
    }

    private static void requireRole(String rol, String expected) {
        if (!expected.equals(rol)) {
            throw new ForbiddenException("No tienes permiso para esta operación");
        }
    }

    private static OrderStatus parseStatus(String raw) {
        if (raw == null) {
            throw new ValidationException("El campo 'status' es obligatorio");
        }
        try {
            return OrderStatus.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw new ValidationException("El estado '" + raw + "' no existe");
        }
    }

    private static PaymentMethod parseMethod(String raw) {
        if (raw == null) {
            throw new ValidationException("El campo 'method' es obligatorio");
        }
        try {
            return PaymentMethod.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw new ValidationException("El método de pago '" + raw + "' no existe");
        }
    }
}
