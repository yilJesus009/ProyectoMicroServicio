package com.repuestosya.pedidos.presentation.http;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** docs/contratos-api.md: GET /health -> {"status": "UP"}, publico, sin JWT. */
@RestController
public class HealthController {

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
