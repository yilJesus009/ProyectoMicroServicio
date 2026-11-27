package com.repuestosya.pedidos.presentation.http;

import com.repuestosya.pedidos.domain.errors.ForbiddenException;
import com.repuestosya.pedidos.domain.errors.InvalidOrderTransitionException;
import com.repuestosya.pedidos.domain.errors.OrderNotFoundException;
import com.repuestosya.pedidos.domain.errors.PaymentAlreadyExistsException;
import com.repuestosya.pedidos.domain.errors.ValidationException;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Manejador global de errores. Mapea errores de dominio a HTTP y SIEMPRE
 * responde con el sobre {status, msg, data}. Nunca expone el stack trace.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(ValidationException e) {
        return respond(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleMalformedBody(HttpMessageNotReadableException e) {
        // Jackson envuelve lo que lance un @JsonAnySetter (p. ej. PaymentRequest
        // rechazando un campo que no es 'method') en una JsonMappingException,
        // y Spring la envuelve de nuevo acá. Si la causa real es nuestro
        // ValidationException, mostramos ese mensaje en vez del genérico.
        String message = findValidationMessage(e).orElse("El cuerpo de la petición no es JSON válido");
        return respond(HttpStatus.BAD_REQUEST, message);
    }

    private static Optional<String> findValidationMessage(Throwable error) {
        Throwable cause = error;
        while (cause != null) {
            if (cause instanceof ValidationException) {
                return Optional.of(cause.getMessage());
            }
            cause = cause.getCause();
        }
        return Optional.empty();
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiResponse<Void>> handleForbidden(ForbiddenException e) {
        return respond(HttpStatus.FORBIDDEN, e.getMessage());
    }

    @ExceptionHandler(OrderNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(OrderNotFoundException e) {
        return respond(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(InvalidOrderTransitionException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidTransition(InvalidOrderTransitionException e) {
        return respond(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage());
    }

    @ExceptionHandler(PaymentAlreadyExistsException.class)
    public ResponseEntity<ApiResponse<Void>> handlePaymentAlreadyExists(PaymentAlreadyExistsException e) {
        return respond(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception e) {
        log.error("[GlobalExceptionHandler]", e);
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno del servidor");
    }

    private static ResponseEntity<ApiResponse<Void>> respond(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(new ApiResponse<>(status.value(), message, null));
    }
}
