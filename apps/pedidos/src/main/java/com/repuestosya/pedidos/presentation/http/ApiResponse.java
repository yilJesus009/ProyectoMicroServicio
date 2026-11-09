package com.repuestosya.pedidos.presentation.http;

/** Sobre de respuesta obligatorio (docs/convenciones.md §3). */
public record ApiResponse<T>(int status, String msg, T data) {

    public static <T> ApiResponse<T> ok(T data, String msg) {
        return new ApiResponse<>(200, msg, data);
    }

    public static <T> ApiResponse<T> created(T data, String msg) {
        return new ApiResponse<>(201, msg, data);
    }
}
