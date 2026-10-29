'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { PartRequest } = require('../../src/domain/entities/partRequest');
const { ChangePartRequestStatus } = require('../../src/application/commands/changePartRequestStatus');
const { CreatePartRequest } = require('../../src/application/commands/createPartRequest');
const { GetPartRequestById } = require('../../src/application/queries/getPartRequestById');
const { PartRequestEvent, Topic } = require('../../src/application/contracts');

/** Repositorio en memoria (fake del contrato IPartRequestRepository). */
class InMemoryRepository {
  constructor(seed = []) {
    this.rows = [...seed];
    this.nextId = seed.length + 1;
  }

  async findById(id) {
    return this.rows.find((r) => r.id === id) ?? null;
  }

  async findAll(filters = {}) {
    return this.rows.filter(
      (r) =>
        (!filters.city || r.city === filters.city) &&
        (!filters.status || r.status === filters.status)
    );
  }

  async save(entity) {
    if (entity.id == null) {
      entity.id = this.nextId++;
      this.rows.push(entity);
      return entity;
    }
    return entity;
  }
}

/** Publisher que registra lo publicado y opcionalmente falla. */
class SpyPublisher {
  constructor({ fail = false } = {}) {
    this.fail = fail;
    this.published = [];
  }

  async publish(topic, eventName, payload, correlationId) {
    if (this.fail) throw new Error('bus caído');
    this.published.push({ topic, eventName, payload, correlationId });
  }
}

const OWNER_ID = 12;

function seedRequest(overrides = {}) {
  return new PartRequest({
    id: 7,
    userId: OWNER_ID,
    userEmail: 'juan@taller.com',
    vehicleBrand: 'Toyota',
    vehicleModel: 'Hilux',
    vehicleYear: 2019,
    description: 'Filtro de aceite',
    city: 'La Paz',
    ...overrides,
  });
}

test('cambiar estado de solicitud inexistente → PartRequestNotFoundException (404)', async () => {
  const useCase = new ChangePartRequestStatus({
    partRequestRepository: new InMemoryRepository(),
    eventPublisher: new SpyPublisher(),
  });

  await assert.rejects(
    useCase.execute({ requestId: 999, newStatus: 'CANCELLED', actorId: OWNER_ID }),
    (err) => {
      assert.equal(err.name, 'PartRequestNotFoundException');
      return true;
    }
  );
});

test('el que NO es el dueño no puede cambiar el estado → ForbiddenException (403)', async () => {
  const repository = new InMemoryRepository([seedRequest()]);
  const useCase = new ChangePartRequestStatus({
    partRequestRepository: repository,
    eventPublisher: new SpyPublisher(),
  });

  await assert.rejects(
    useCase.execute({ requestId: 7, newStatus: 'CANCELLED', actorId: 999 }),
    (err) => {
      assert.equal(err.name, 'ForbiddenException');
      return true;
    }
  );

  // La solicitud no fue tocada.
  const current = await repository.findById(7);
  assert.equal(current.status, 'PUBLISHED');
});

test('transición inválida desde el caso de uso → 422 y no persiste', async () => {
  const repository = new InMemoryRepository([seedRequest()]);
  const publisher = new SpyPublisher();
  const useCase = new ChangePartRequestStatus({
    partRequestRepository: repository,
    eventPublisher: publisher,
  });

  await assert.rejects(
    useCase.execute({ requestId: 7, newStatus: 'COMPLETED', actorId: OWNER_ID }),
    (err) => {
      assert.equal(err.name, 'InvalidPartRequestTransitionException');
      return true;
    }
  );
  assert.equal(publisher.published.length, 0, 'no se publica evento si la regla falla');
});

test('cambio de estado exitoso publica PART_REQUEST_STATUS_CHANGED con el contrato', async () => {
  const repository = new InMemoryRepository([seedRequest()]);
  const publisher = new SpyPublisher();
  const useCase = new ChangePartRequestStatus({
    partRequestRepository: repository,
    eventPublisher: publisher,
  });

  const result = await useCase.execute({
    requestId: 7,
    newStatus: 'ORDERED',
    actorId: OWNER_ID,
    correlationId: 'corr-123',
  });

  assert.equal(result.status, 'ORDERED');
  assert.equal(publisher.published.length, 1);

  const evt = publisher.published[0];
  assert.equal(evt.topic, Topic.PART_REQUEST);
  assert.equal(evt.eventName, PartRequestEvent.STATUS_CHANGED);
  assert.equal(evt.correlationId, 'corr-123');
  assert.deepEqual(evt.payload, {
    request_id: 7,
    previous_status: 'PUBLISHED',
    new_status: 'ORDERED',
  });
});

test('crear solicitud publica PART_REQUEST_CREATED con el payload del contrato', async () => {
  const repository = new InMemoryRepository();
  const publisher = new SpyPublisher();
  const useCase = new CreatePartRequest({
    partRequestRepository: repository,
    eventPublisher: publisher,
  });

  const saved = await useCase.execute({
    userId: OWNER_ID,
    userEmail: 'juan@taller.com',
    data: {
      vehicleBrand: 'Toyota',
      vehicleModel: 'Hilux',
      vehicleYear: 2019,
      description: 'Filtro de aceite',
      city: 'La Paz',
      urgency: 'ALTA',
    },
  });

  assert.equal(saved.status, 'PUBLISHED');
  assert.equal(publisher.published.length, 1);

  const evt = publisher.published[0];
  assert.equal(evt.topic, Topic.PART_REQUEST);
  assert.equal(evt.eventName, PartRequestEvent.CREATED);
  assert.deepEqual(evt.payload, {
    request_id: 1,
    user_id: OWNER_ID,
    user_email: 'juan@taller.com',
    vehicle_brand: 'Toyota',
    vehicle_model: 'Hilux',
    vehicle_year: 2019,
    city: 'La Paz',
    urgency: 'ALTA',
  });
});

test('si el bus está caído, la operación principal NO falla (regla eventos.md 3)', async () => {
  const repository = new InMemoryRepository([seedRequest()]);
  const useCase = new ChangePartRequestStatus({
    partRequestRepository: repository,
    eventPublisher: new SpyPublisher({ fail: true }),
  });

  const result = await useCase.execute({
    requestId: 7,
    newStatus: 'CANCELLED',
    actorId: OWNER_ID,
  });

  assert.equal(result.status, 'CANCELLED', 'el estado se guardó igual');
});

test('consultar solicitud inexistente → PartRequestNotFoundException (404)', async () => {
  const query = new GetPartRequestById({
    partRequestRepository: new InMemoryRepository(),
  });
  await assert.rejects(query.execute(42), (err) => {
    assert.equal(err.name, 'PartRequestNotFoundException');
    return true;
  });
});
