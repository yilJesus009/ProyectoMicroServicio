package com.repuestosya.pedidos.infrastructure.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import org.springframework.context.annotation.Configuration;

/** Metadatos de la spec OpenAPI (/v3/api-docs), sin UI propia (ver JwtAuthFilter). */
@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Pedidos — RepuestosYa",
                description = "Pedido, pago simulado y seguimiento hasta la entrega.",
                version = "1.0"))
@SecurityScheme(
        name = "bearerAuth",
        type = io.swagger.v3.oas.annotations.enums.SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        in = SecuritySchemeIn.HEADER)
public class OpenApiConfig {}
