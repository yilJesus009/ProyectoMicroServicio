---
name: testing-quality
description: Escribir y mantener pruebas unitarias, de integración y de contratos en los microservicios y el frontend. Cubrir reglas de negocio, en especial la regla de una sola oferta aceptada y las transiciones de estado de la solicitud, oferta y pedido. Usar al crear o revisar pruebas.
---

# Testing y calidad

> La regla de una sola oferta aceptada debe tener pruebas que la cubran
> explícitamente: es la que se prueba en la defensa.

## Antes de empezar

1. Leer `AGENTS.md` y `docs/flujo-principal.md` (estados y "Casos que
   siempre deben probarse").
2. Verificar que el comando de pruebas corre antes de escribir nuevas.

## Pirámide de pruebas

| Nivel | Qué cubre | Cuántas |
|---|---|---|
| **Unitarias** | Reglas de negocio en `domain/`/`application/`, sin BD | Muchas |
| **De integración** | Casos de uso con Postgres real | Las importantes |
| **De contrato** | Envelope de respuesta y payload de eventos | Las que cruzan servicios |
| **End-to-end** | El flujo principal completo (`scripts/e2e-flujo.mjs`) | Pocas, las críticas |

## Prioridad absoluta: una sola oferta aceptada (en `negociacion`)

```javascript
describe('AcceptOfferCommand', () => {
  it('acepta una oferta y rechaza las demás en la misma transacción', async () => {
    await handler.execute({ offerId: 78, actorId: 12 });
    expect(offer.status).toBe('ACCEPTED');
    expect(rival.status).toBe('REJECTED');
    expect(outbox.insert).toHaveBeenCalledWith(expect.objectContaining({ event_name: 'OFFER_ACCEPTED' }));
  });

  it('lanza si la solicitud ya tiene oferta aceptada (409)', async () => {
    await expect(handler.execute({ offerId: 78, actorId: 12 }))
      .rejects.toThrow(OfferAlreadyAcceptedException);
  });

  it('bloquea la fila de la solicitud antes de validar (SELECT ... FOR UPDATE)', async () => {
    await handler.execute({ offerId: 78, actorId: 12 });
    expect(repo.lockRequest).toHaveBeenCalledWith(34, expect.anything());
  });

  it('con dos aceptaciones simultáneas, solo una gana', async () => {
    const results = await Promise.allSettled([accept(78), accept(79)]);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(1);
  });
});
```

Y la prueba de integración que confirma el índice `UNIQUE` parcial contra
Postgres real (la defensa final, no la validación de aplicación).

## Transiciones de estado (`docs/flujo-principal.md`)

```javascript
describe('ChangeOrderStatus', () => {
  const validas = [
    ['PENDING_PAYMENT', 'PREPARING'],
    ['PREPARING', 'IN_TRANSIT'],      // solo si delivery_type = DELIVERY
    ['PREPARING', 'READY_FOR_PICKUP'],// solo si delivery_type = PICKUP
    ['IN_TRANSIT', 'DELIVERED'],
    ['DELIVERED', 'COMPLETED'],
  ];
  const invalidas = [
    ['PREPARING', 'DELIVERED'],       // se salta el tránsito
    ['READY_FOR_PICKUP', 'IN_TRANSIT'], // mezcla delivery_type
  ];

  it.each(validas)('permite %s → %s', async (from, to) => {
    await expect(changeStatus(orderIn(from), to)).resolves.toBeTruthy();
  });
  it.each(invalidas)('rechaza %s → %s con 422', async (from, to) => {
    await expect(changeStatus(orderIn(from), to)).rejects.toThrow(InvalidOrderTransitionException);
  });
});
```

Un pedido `PICKUP` que intenta pasar a `IN_TRANSIT` es **422**, no 403;
si el rol no corresponde (comprador despachando), sí es **403**.

## Idempotencia de los consumidores

```javascript
it('procesa el mismo OFFER_ACCEPTED dos veces sin crear dos pedidos', async () => {
  const msg = buildEvent('OFFER_ACCEPTED', { offer_id: 78, part_request_id: 34 });
  await consumer.handle(msg);
  await consumer.handle(msg);   // duplicado
  expect(await Order.count()).toBe(1);
});
```

## Pruebas de contrato

```javascript
it('POST /api/v1/offers responde con el envelope correcto', async () => {
  const res = await request(app).post('/api/v1/offers').send(offerData);
  expect(res.body).toMatchObject({ status: 201, msg: expect.any(String) });
  expect(res.body).toHaveProperty('data');
});

it('OFFER_ACCEPTED tiene event_id, version y el payload documentado', async () => {
  const event = publisher.lastPublished('OFFER_ACCEPTED');
  expect(event).toMatchObject({ event_name: 'OFFER_ACCEPTED', version: 1, producer: 'negociacion' });
  expect(event.event_id).toBeDefined();
});
```

## Pruebas de los guards del frontend

Son **comodidad visual**; la autorización real está en el backend y esa sí
se prueba con una llamada HTTP sin permiso esperando `403`.

## Casos que siempre hay que cubrir

- [ ] Aceptar una oferta deja las demás `REJECTED`.
- [ ] Segunda oferta aceptada de la misma solicitud → `409`.
- [ ] Dos aceptaciones simultáneas: solo una gana.
- [ ] Proveedor no aprobado no puede ofertar → `403`.
- [ ] No se puede ofertar en solicitud cancelada o con oferta aceptada → `422`.
- [ ] `OFFER_ACCEPTED` repetido crea **un** pedido.
- [ ] Pedido `PICKUP` no puede pasar a `IN_TRANSIT` → `422`.
- [ ] Al completarse el pedido, la solicitud queda `COMPLETED`.
- [ ] Fallo de RabbitMQ no impide la operación principal.
- [ ] Ningún `500` expone el stack trace.

## Ejecutar las pruebas

```bash
cd apps/negociacion   && npm test
cd apps/notificaciones && npm test
cd apps/identidad      && python manage.py test
cd apps/pedidos        && mvn test
cd apps/catalogo       && npm test
cd apps/frontend       && ng test
```

## Regla de honestidad

**Nunca afirmes que una prueba pasó si no la ejecutaste.** Si no pudiste
correrla, dilo explícitamente en el resumen.

## Al terminar

Todas las pruebas nuevas pasan y las existentes no se rompieron; la regla
de una sola oferta aceptada y las transiciones tienen cobertura. Resumir
qué se probó, qué no, y por qué.
