---
name: testing-quality
description: Escribir y mantener pruebas unitarias, de integración y de contratos en los microservicios y el frontend. Cubrir reglas de negocio, en especial la regla de una sola oferta aceptada y las transiciones de estado del pedido. Usar al crear o revisar pruebas.
---

# Testing y calidad

> Un proyecto académico se defiende mostrando que las reglas de negocio
> funcionan. **La regla de una sola oferta aceptada debe tener pruebas que la
> cubran explícitamente**: es la que el docente va a probar.

## Antes de empezar

1. Leer `AGENTS.md`.
2. Leer `docs/flujo-principal.md` (las reglas que hay que probar).
3. Verificar que el comando de pruebas corre antes de escribir nuevas.

## Pirámide de pruebas

| Nivel | Qué cubre | Velocidad | Cuántas |
|---|---|---|---|
| **Unitarias** | Reglas de negocio en `domain/` y `application/` | Rápidas | Muchas |
| **De integración** | Casos de uso con BD real, adaptadores | Medianas | Las importantes |
| **De contrato** | Formato de respuesta y payload de eventos | Rápidas | Las que cruzan servicios |
| **End-to-end** | El flujo principal completo | Lentas | Pocas, las críticas |

**Lo más valioso de probar está en `domain/`**, porque ahí vive la regla de
negocio y no depende de Express ni de la base de datos. Se pueden probar sin
levantar nada.

## Prioridad absoluta: la regla de una sola oferta aceptada

```javascript
describe('AcceptOfferCommandHandler', () => {
  it('acepta una oferta y rechaza las demás en la misma transacción', async () => {
    const offer    = makeOffer({ id: 78, requestId: 34, status: 'SUBMITTED' });
    const rival    = makeOffer({ id: 79, requestId: 34, status: 'SUBMITTED' });
    repo.findByRequestId.mockResolvedValue([offer, rival]);

    await handler.execute({ offerId: 78, actorId: 12 });

    expect(offer.status).toBe('ACCEPTED');
    expect(rival.status).toBe('REJECTED');
    expect(publisher.publish).toHaveBeenCalledWith(
      'offer_events', 'OFFER_ACCEPTED', expect.objectContaining({ offer_id: 78 })
    );
  });

  it('lanza OfferAlreadyAcceptedException si la solicitud ya tiene oferta aceptada', async () => {
    const offer = makeOffer({ id: 78, requestId: 34 });
    repo.findAcceptedByRequestId.mockResolvedValue(
      makeOffer({ id: 70, requestId: 34, status: 'ACCEPTED' })
    );

    await expect(handler.execute({ offerId: 78, actorId: 12 }))
      .rejects.toThrow(OfferAlreadyAcceptedException);
  });

  it('bloquea la fila de la solicitud antes de validar (evita condición de carrera)', async () => {
    await handler.execute({ offerId: 78, actorId: 12 });
    expect(repo.lockRequest).toHaveBeenCalledWith(34, expect.anything());
  });
});
```

Y la prueba de integración que confirma el índice en la base de datos, que es
la defensa final:

```javascript
it('falla con error de índice si dos ofertas intentan quedar ACCEPTED', async () => {
  await Offer.create({ id: 1, requestId: 34, status: 'ACCEPTED' });
  // la segunda debe rechazarse por el índice UNIQUE, no por la validación
  await expect(
    Offer.create({ id: 2, requestId: 34, status: 'ACCEPTED' })
  ).rejects.toThrow(/unique/i);
});
```

## Transiciones de estado del pedido

```javascript
describe('ChangeOrderStatus', () => {
  const validas = [
    ['PENDING',   'PREPARING'],
    ['PREPARING', 'SHIPPED'],
    ['SHIPPED',   'DELIVERED'],
    ['DELIVERED', 'COMPLETED'],
  ];
  const invalidas = [
    ['PENDING',   'SHIPPED'],     // se salta PREPARING
    ['COMPLETED', 'SHIPPED'],     // retrocede
    ['CANCELLED', 'PREPARING'],   // ya está cancelado
  ];

  it.each(validas)('permite %s → %s', async (from, to) => {
    await expect(changeStatus(orderIn(from), to)).resolves.toBeTruthy();
  });

  it.each(invalidas)('rechaza %s → %s con 422', async (from, to) => {
    await expect(changeStatus(orderIn(from), to)).rejects.toThrow(
      InvalidOrderTransitionException
    );
  });
});
```

## Idempotencia de los consumidores

RabbitMQ entrega **al menos una vez**. Probar que un evento repetido no
duplica efectos:

```javascript
it('procesa el mismo OFFER_ACCEPTED dos veces sin crear dos pedidos', async () => {
  const msg = buildEvent('OFFER_ACCEPTED', { offer_id: 78, request_id: 34 });

  await consumer.handle(msg);
  await consumer.handle(msg);   // duplicado

  expect(await Order.count()).toBe(1);
});
```

## Pruebas de los guards del frontend

```typescript
it('bloquea el acceso a /ofertas para un COMPRADOR', () => {
  auth.setRole('COMPRADOR');
  expect(guard.canActivate(routeWithRoles(['PROVEEDOR']))).toBeFalse();
});

it('permite el acceso a /ofertas para un PROVEEDOR', () => {
  auth.setRole('PROVEEDOR');
  expect(guard.canActivate(routeWithRoles(['PROVEEDOR']))).toBeTrue();
});
```

> Recordar que los guards son **comodidad visual**. La autorización real está
> en el backend, y esa sí se prueba con una llamada HTTP sin permiso esperando
> un `403`.

## Pruebas de contrato

Verificar que la respuesta tiene el envelope `{status, msg, data}` y que los
campos del evento coinciden con `docs/eventos.md`:

```javascript
it('POST /api/v1/offers responde con el envelope correcto', async () => {
  const res = await request(app).post('/api/v1/offers').send(offerData);
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ status: 201, msg: expect.any(String) });
  expect(res.body).toHaveProperty('data');
});

it('OFFER_ACCEPTED tiene el payload documentado', async () => {
  const event = publisher.lastPublished('OFFER_ACCEPTED');
  expect(event).toMatchObject({
    event_name: 'OFFER_ACCEPTED',
    producer:   'offer-service',
    occurred_at: expect.any(String),
    correlation_id: expect.any(String),
  });
  expect(Object.keys(event.payload).sort())
    .toEqual(['buyer_id','currency','delivery_type','offer_id','price','provider_id','request_id']);
});
```

## Casos que siempre hay que cubrir

- [ ] Campo obligatorio ausente → `400`.
- [ ] Email ya registrado → `409`.
- [ ] Token inválido o expirado → `401`.
- [ ] Rol incorrecto para la operación → `403`.
- [ ] Recurso inexistente → `404`.
- **[ ] Segunda oferta aceptada para la misma solicitud → `409`.**
- **[ ] Transición de estado inválida → `422`.**
- [ ] Consumidor idempotente ante evento duplicado.
- [ ] Fallo de RabbitMQ no impide la operación principal.
- [ ] Ningún `500` expone un stack trace.

## Ejecutar las pruebas

```bash
# Express
cd apps/part-request-service && npm test
cd apps/offer-service       && npm test

# Django
cd apps/identity-service && python manage.py test

# Angular
cd apps/frontend && ng test
```

## Regla de honestidad

**Nunca afirmes que una prueba pasó si no la ejecutaste.** Si no pudiste
correrla, dilo explícitamente en el resumen. Es preferible reportar "escribí
la prueba pero no pude ejecutarla porque falta levantar la BD" a descubrirlo
después en la revisión.

## Al terminar

- Todas las pruebas nuevas pasan, y las existentes no se rompieron.
- La regla de una sola oferta aceptada tiene cobertura.
- Las transiciones de estado tienen cobertura.
- Resumir: qué se probó, qué no, y por qué.
