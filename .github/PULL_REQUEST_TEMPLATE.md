## Descripción

<!-- Qué hace este PR y por qué. Máximo 3 párrafos. -->

## Tipo de cambio

- [ ] `feat` — funcionalidad nueva
- [ ] `fix` — corrección de un bug
- [ ] `test` — solo pruebas
- [ ] `docs` — solo documentación
- [ ] `refactor` — sin cambiar el comportamiento
- [ ] `chore` — infraestructura, configuración

## Área

<!-- Marcar los servicios afectados -->

- [ ] identity-service
- [ ] part-request-service
- [ ] offer-service
- [ ] order-service
- [ ] catalog-vehicle-service
- [ ] notification-service
- [ ] api-gateway
- [ ] frontend
- [ ] infra / docs

## Contratos

<!-- Si este PR crea o modifica un endpoint o un evento -->

- [ ] No toca contratos entre servicios.
- [ ] Documentó los cambios en `docs/contratos-api.md`.
- [ ] Documentó los cambios en `docs/eventos.md`.
- [ ] Avisó a los integrantes afectados.

## Regla crítica de negocio

<!-- Obligatorio si toca offer-service -->

- [ ] No aplica.
- [ ] Toca `offer-service` y la regla de una sola oferta aceptada sigue
      intacta: índice `UNIQUE` parcial, transacción con `SELECT ... FOR UPDATE`,
      y `OfferAlreadyAcceptedException` en el dominio.

## Cómo probarlo

<!-- Pasos concretos para que el revisor reproduzca lo que hiciste -->

1.
2.
3.

## Pruebas

- [ ] Agregué pruebas para la lógica de negocio nueva.
- [ ] Ejecuté las pruebas y pasan.
- [ ] No rompí las pruebas existentes.

<!-- Si no ejecutaste las pruebas, di explícitamente por qué abajo. -->

## Checklist

- [ ] Lee `docs/convenciones.md` (nombres, envelope `{status, msg, data}`, commits).
- [ ] No modifiqué un servicio que no me pertenece, o lo acordé con su dueño.
- [ ] Nada de secretos en el código; `.env.example` actualizado si aplica.
- [ ] Ningún servicio consulta la base de otro.
- [ ] Ninguna llamada directa a un microservicio desde el frontend.
- [ ] Los commits siguen Conventional Commits.

## Limitaciones y notas

<!-- Qué no cubre, qué queda pendiente, qué sabes que podría mejorar -->
