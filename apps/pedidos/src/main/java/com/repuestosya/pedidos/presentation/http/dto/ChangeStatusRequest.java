package com.repuestosya.pedidos.presentation.http.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Body de PATCH /orders/{id}/status. */
public record ChangeStatusRequest(
        @Schema(example = "IN_TRANSIT", allowableValues = {"PREPARING", "IN_TRANSIT", "READY_FOR_PICKUP", "DELIVERED"})
                String status) {}
