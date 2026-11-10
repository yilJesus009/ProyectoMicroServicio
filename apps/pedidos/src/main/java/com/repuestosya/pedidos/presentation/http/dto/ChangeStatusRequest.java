package com.repuestosya.pedidos.presentation.http.dto;

/** Body de PATCH /orders/{id}/status. */
public record ChangeStatusRequest(String status) {}
