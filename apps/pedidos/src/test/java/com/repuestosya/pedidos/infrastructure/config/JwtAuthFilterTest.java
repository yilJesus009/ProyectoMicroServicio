package com.repuestosya.pedidos.infrastructure.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;

class JwtAuthFilterTest {

    private static final String SECRET = "una-clave-de-prueba-de-al-menos-32-caracteres";

    private JwtAuthFilter newFilter() {
        return new JwtAuthFilter(SECRET);
    }

    private String signToken(long userId, String rol) {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .claim("user_id", userId)
                .claim("rol", rol)
                .setExpiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    @Test
    void noFiltraHealth() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/health");

        assertThat(newFilter().shouldNotFilter(request)).isTrue();
    }

    @Test
    void siFiltraOtrasRutas() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/v1/orders/mine");

        assertThat(newFilter().shouldNotFilter(request)).isFalse();
    }

    @Test
    void rechazaSinTokenConEnvelope401() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        FilterChain chain = mock(FilterChain.class);
        StringWriter body = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(body));

        newFilter().doFilterInternal(request, response, chain);

        verify(response).setStatus(401);
        assertThat(body.toString()).contains("\"status\":401").contains("Token no proporcionado");
        verify(chain, never()).doFilter(request, response);
    }

    @Test
    void rechazaTokenInvalido() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        FilterChain chain = mock(FilterChain.class);
        StringWriter body = new StringWriter();
        when(request.getHeader("Authorization")).thenReturn("Bearer token-basura");
        when(response.getWriter()).thenReturn(new PrintWriter(body));

        newFilter().doFilterInternal(request, response, chain);

        verify(response).setStatus(401);
        verify(chain, never()).doFilter(request, response);
    }

    @Test
    void aceptaTokenValidoYDejaLosClaimsEnLaRequest() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        FilterChain chain = mock(FilterChain.class);
        when(request.getHeader("Authorization")).thenReturn("Bearer " + signToken(12, "COMPRADOR"));

        newFilter().doFilterInternal(request, response, chain);

        verify(chain).doFilter(request, response);
        verify(request).setAttribute(JwtAuthFilter.USER_ID_ATTRIBUTE, 12);
        verify(request).setAttribute(JwtAuthFilter.ROL_ATTRIBUTE, "COMPRADOR");
    }
}
