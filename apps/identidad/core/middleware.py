"""
Middleware de correlación.

- `X-Correlation-Id`: lo manda el Gateway (o el cliente); si no viene, se
  genera uno. Se usa como correlation_id de los eventos publicados.
- `X-User-Id` del Gateway se lee SOLO como referencia/logging: la
  autenticación de este servicio siempre es por JWT (AGENTS.md 4.5).
"""
import uuid


class CorrelationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.correlation_id = (
            request.headers.get("X-Correlation-Id") or str(uuid.uuid4())
        )
        request.gateway_user_id = request.headers.get("X-User-Id")
        return self.get_response(request)
