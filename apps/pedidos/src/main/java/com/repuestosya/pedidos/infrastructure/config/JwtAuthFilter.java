package com.repuestosya.pedidos.infrastructure.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Valida la FIRMA del JWT con JWT_SECRET (AGENTS.md 4.5): este servicio no
 * confia solo en lo que ya valido el Gateway. Filtro propio en vez de Spring
 * Security completo: todavia no hay endpoints protegidos que lo necesiten
 * (llegan en la fase 3), pero /health debe seguir siendo publico.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    public static final String USER_ID_ATTRIBUTE = "userId";
    public static final String ROL_ATTRIBUTE = "rol";

    private final SecretKey signingKey;

    public JwtAuthFilter(@Value("${app.jwt.secret}") String jwtSecret) {
        this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "/health".equals(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            respondUnauthorized(response, "Token no proporcionado");
            return;
        }

        try {
            Claims claims =
                    Jwts.parserBuilder()
                            .setSigningKey(signingKey)
                            .build()
                            .parseClaimsJws(header.substring(7))
                            .getBody();
            request.setAttribute(USER_ID_ATTRIBUTE, claims.get("user_id"));
            request.setAttribute(ROL_ATTRIBUTE, claims.get("rol"));
        } catch (JwtException | IllegalArgumentException e) {
            respondUnauthorized(response, "Token inválido o expirado");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void respondUnauthorized(HttpServletResponse response, String msg) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write(
                "{\"status\":401,\"msg\":\"" + msg + "\",\"data\":null}");
    }
}
