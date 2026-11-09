'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { PartRequest } = require('../../src/domain/entities/partRequest');
const { ChangePartRequestStatus } = require('../../src/application/commands/changePartRequestStatus');
const { CreatePartRequest } = require('../../src/application/commands/createPartRequest');
const { GetPartRequestById } = require('../../src/application/queries/getPartRequestById');
const { PartRequestEvent, Topic } = require('../../src/application/contracts');
const { CategoryNotFoundException, CategoryInactiveException } = require('../../src/domain/errors');

/** Fake del puerto hacia Catálogo (application/ports/categoryGateway.js). */
class FakeCategoryGateway {
  constructor(categories = {}) {
    this.categories = categories; // { [id]: { id, name, active } }
    this.calledWith = [];
  }

  async findById(categoryId, token) {
    this.calledWith.push({ categoryId, token });
    const category = this.categories[categoryId];
    if (!category) throw new CategoryNotFoundException(categoryId);
    return category;
  }
}

/** Fake de la copia local de proveedores, sin semántica transaccional (solo lectura en estos casos de uso). */
class FakeSupplierRepository {
  constructor(suppliers = {}) {
    this.suppliers = suppliers; // { [supplierId]: { approved } }
  }

  async findBySupplierId(supplierId) {
    return this.suppliers[supplierId] ?? null;
  }
}

/**
 * Repositorio en memoria CON semántica transaccional real: las escrituras
 * hechas con un `transaction` (token opaco) quedan en un borrador aparte y
 * solo se mezclan con los datos "de verdad" cuando el FakeUnitOfWork hace
 * `commit`. Si hace `rollback`, el borrador se descarta.
 *
 * Es lo que permite probar de verdad "si falla el outbox, la solicitud
 * tampoco queda guardada" sin levantar un Postgres real.
 */
class TransactionalInMemoryRepository {
  constructor(seed = []) {
    this.committedRows = seed.map((r) => ({ ...r }));
    this.nextId = seed.length + 1;
    this.drafts = new Map(); // transaction token -> clon de las filas
  }

  _rowsFor(transaction) {
    if (!transaction) return this.committedRows;
    if (!this.drafts.has(transaction)) {
      this.drafts.set(transaction, this.committedRows.map((r) => ({ ...r })));
    }
    return this.drafts.get(transaction);
  }

  async findById(id, { transaction } = {}) {
    const row = this._rowsFor(transaction).find((r) => r.id === id);
    // Reconstruye la ENTIDAD (no un objeto plano): el caso de uso llama
    // request.assertCanTransition(...), que vive en el prototipo de PartRequest.
    return row ? new PartRequest({ ...row }) : null;
  }

  async findAll(filters = {}) {
    return this.committedRows.filter(
      (r) => (!filters.city || r.city === filters.city) && (!filters.status || r.status === filters.status)
    );
  }

  async save(entity, { transaction } = {}) {
    const rows = this._rowsFor(transaction);
    if (entity.id == null) {
      entity.id = this.nextId++;
      rows.push({ ...entity });
      return entity;
    }
    const idx = rows.findIndex((r) => r.id === entity.id);
    if (idx >= 0) rows[idx] = { ...entity };
    return entity;
  }

  /** Igual que el real: solo escribe si el estado sigue siendo el leído. */
  async updateStatusIfCurrent(id, expectedStatus, newStatus, { transaction } = {}) {
    const rows = this._rowsFor(transaction);
    const row = rows.find((r) => r.id === id);
    if (!row || row.status !== expectedStatus) return false;
    row.status = newStatus;
    return true;
  }

  commit(transaction) {
    if (this.drafts.has(transaction)) {
      this.committedRows = this.drafts.get(transaction);
      this.drafts.delete(transaction);
    }
  }

  rollback(transaction) {
    this.drafts.delete(transaction);
  }
}

/** Outbox en memoria con la misma semántica transaccional. */
class TransactionalInMemoryOutboxRepository {
  constructor() {
    this.committed = [];
    this.drafts = new Map();
    this.failNext = false; // simula un fallo real al guardar en outbox_events
  }

  async enqueue(envelope, { exchange, routingKey, transaction } = {}) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('outbox_events: fallo simulado de escritura');
    }
    const draft = this.drafts.get(transaction) ?? [];
    draft.push({ ...envelope, _exchange: exchange, _routingKey: routingKey });
    this.drafts.set(transaction, draft);
  }

  commit(transaction) {
    if (this.drafts.has(transaction)) {
      this.committed.push(...this.drafts.get(transaction));
      this.drafts.delete(transaction);
    }
  }

  rollback(transaction) {
    this.drafts.delete(transaction);
  }
}

/**
 * Fake de IUnitOfWork: coordina el commit/rollback de todos los
 * repositorios "participantes" al estilo de una transacción real.
 */
class FakeUnitOfWork {
  constructor(participants) {
    this.participants = participants;
  }

  async run(fn) {
    const transaction = Symbol('fake-transaction');
    try {
      const result = await fn(transaction);
      for (const p of this.participants) p.commit(transaction);
      return result;
    } catch (error) {
      for (const p of this.participants) p.rollback(transaction);
      throw error;
    }
  }
}

const OWNER_ID = 12;
const PRODUCER = 'negociacion';

function seedRequest(overrides = {}) {
  return new PartRequest({
    id: 7,
    userId: OWNER_ID,
    userEmail: 'juan@taller.com',
    categoryId: 1,
    categoryName: 'Frenos',
    vehicleBrand: 'Toyota',
    vehicleModel: 'Hilux',
    vehicleYear: 2019,
    description: 'Filtro de aceite',
    city: 'La Paz',
    ...overrides,
  });
}

function makeChangeStatusUseCase({ repository, outbox }) {
  return new ChangePartRequestStatus({
    partRequestRepository: repository,
    outboxRepository: outbox,
    unitOfWork: new FakeUnitOfWork([repository, outbox]),
    producer: PRODUCER,
  });
}

function makeCreateUseCase({ repository, outbox, categoryGateway }) {
  return new CreatePartRequest({
    partRequestRepository: repository,
    outboxRepository: outbox,
    unitOfWork: new FakeUnitOfWork([repository, outbox]),
    categoryGateway: categoryGateway ?? new FakeCategoryGateway({ 1: { id: 1, name: 'Frenos', active: true } }),
    producer: PRODUCER,
  });
}

test('cambiar estado de solicitud inexistente → PartRequestNotFoundException (404)', async () => {
  const useCase = makeChangeStatusUseCase({
    repository: new TransactionalInMemoryRepository(),
    outbox: new TransactionalInMemoryOutboxRepository(),
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
  const repository = new TransactionalInMemoryRepository([seedRequest()]);
  const useCase = makeChangeStatusUseCase({ repository, outbox: new TransactionalInMemoryOutboxRepository() });

  await assert.rejects(
    useCase.execute({ requestId: 7, newStatus: 'CANCELLED', actorId: 999 }),
    (err) => {
      assert.equal(err.name, 'ForbiddenException');
      return true;
    }
  );

  const current = await repository.findById(7);
  assert.equal(current.status, 'PUBLISHED');
});

test('transición inválida desde el caso de uso → 422 y no persiste', async () => {
  const repository = new TransactionalInMemoryRepository([seedRequest({ status: 'CANCELLED' })]);
  const outbox = new TransactionalInMemoryOutboxRepository();
  const useCase = makeChangeStatusUseCase({ repository, outbox });

  // CANCELLED es terminal: ni siquiera repetir el mismo estado es legal.
  await assert.rejects(
    useCase.execute({ requestId: 7, newStatus: 'CANCELLED', actorId: OWNER_ID }),
    (err) => {
      assert.equal(err.name, 'InvalidPartRequestTransitionException');
      return true;
    }
  );
  assert.equal(outbox.committed.length, 0, 'no se encola evento si la regla falla');
});

test('cambio de estado exitoso encola PART_REQUEST_STATUS_CHANGED con event_id y version', async () => {
  const repository = new TransactionalInMemoryRepository([seedRequest()]);
  const outbox = new TransactionalInMemoryOutboxRepository();
  const useCase = makeChangeStatusUseCase({ repository, outbox });

  // CANCELLED es la única transición que el cliente puede ejecutar hoy:
  // PUBLISHED → OFFER_ACCEPTED la asigna el caso de uso de aceptar oferta.
  const result = await useCase.execute({
    requestId: 7,
    newStatus: 'CANCELLED',
    actorId: OWNER_ID,
    correlationId: 'corr-123',
  });

  assert.equal(result.status, 'CANCELLED');
  assert.equal(outbox.committed.length, 1);

  const envelope = outbox.committed[0];
  assert.equal(envelope._exchange, Topic.PART_REQUEST);
  assert.equal(envelope._routingKey, PartRequestEvent.STATUS_CHANGED);
  assert.equal(envelope.event_name, PartRequestEvent.STATUS_CHANGED);
  assert.equal(envelope.version, 1);
  assert.equal(typeof envelope.event_id, 'string');
  assert.ok(envelope.event_id.length > 0);
  assert.equal(envelope.producer, PRODUCER);
  assert.equal(envelope.correlation_id, 'corr-123');
  assert.deepEqual(envelope.payload, {
    request_id: 7,
    previous_status: 'PUBLISHED',
    new_status: 'CANCELLED',
  });
});

test('OFFER_ACCEPTED no sale de una petición → EventDrivenStatusException (422)', async () => {
  const repository = new TransactionalInMemoryRepository([seedRequest()]);
  const outbox = new TransactionalInMemoryOutboxRepository();
  const useCase = makeChangeStatusUseCase({ repository, outbox });

  await assert.rejects(
    useCase.execute({ requestId: 7, newStatus: 'OFFER_ACCEPTED', actorId: OWNER_ID }),
    (err) => {
      assert.equal(err.name, 'EventDrivenStatusException');
      assert.equal(err.eventName, 'OFFER_ACCEPTED');
      return true;
    }
  );

  assert.equal(outbox.committed.length, 0, 'no se encola nada');
  const current = await repository.findById(7);
  assert.equal(current.status, 'PUBLISHED', 'el estado no cambió');
});

test('COMPLETED tampoco sale de una petición → EventDrivenStatusException (422)', async () => {
  const repository = new TransactionalInMemoryRepository([seedRequest({ status: 'OFFER_ACCEPTED' })]);
  const outbox = new TransactionalInMemoryOutboxRepository();
  const useCase = makeChangeStatusUseCase({ repository, outbox });

  await assert.rejects(
    useCase.execute({ requestId: 7, newStatus: 'COMPLETED', actorId: OWNER_ID }),
    (err) => {
      assert.equal(err.name, 'EventDrivenStatusException');
      assert.equal(err.eventName, 'ORDER_STATUS_CHANGED');
      return true;
    }
  );
});

test('escritura concurrente: el que pierde recibe 409 y no publica', async () => {
  const repository = new TransactionalInMemoryRepository([seedRequest()]);
  const outbox = new TransactionalInMemoryOutboxRepository();
  const useCase = makeChangeStatusUseCase({ repository, outbox });

  // El dueño lee PUBLISHED y, antes de escribir, OFFER_ACCEPTED deja la
  // solicitud en ese estado. Su CANCELLED ya no debe aplicarse ni publicarse.
  const casReal = repository.updateStatusIfCurrent.bind(repository);
  repository.updateStatusIfCurrent = async (id, expected, next, opts) => {
    repository.committedRows[0].status = 'OFFER_ACCEPTED';
    return casReal(id, expected, next, opts);
  };

  await assert.rejects(
    useCase.execute({ requestId: 7, newStatus: 'CANCELLED', actorId: OWNER_ID }),
    (err) => {
      assert.equal(err.name, 'PartRequestStatusConflictException');
      return true;
    }
  );

  assert.equal(outbox.committed.length, 0, 'el perdedor no publica evento');
  const current = await repository.findById(7);
  assert.equal(current.status, 'OFFER_ACCEPTED', 'no se pisa la escritura que ganó');
});

test('si falla el guardado en outbox_events, la solicitud tampoco queda guardada (atomicidad)', async () => {
  const repository = new TransactionalInMemoryRepository([seedRequest()]);
  const outbox = new TransactionalInMemoryOutboxRepository();
  outbox.failNext = true; // el insert en outbox_events falla esta vez
  const useCase = makeChangeStatusUseCase({ repository, outbox });

  await assert.rejects(
    useCase.execute({ requestId: 7, newStatus: 'CANCELLED', actorId: OWNER_ID }),
    (err) => {
      assert.match(err.message, /outbox_events/);
      return true;
    }
  );

  // El cambio de estado se revirtió junto con el outbox: sigue PUBLISHED.
  const current = await repository.findById(7);
  assert.equal(current.status, 'PUBLISHED', 'la transacción completa se revirtió');
  assert.equal(outbox.committed.length, 0);
});

test('crear solicitud valida la categoria contra Catalogo y encola PART_REQUEST_CREATED con el payload del contrato', async () => {
  const repository = new TransactionalInMemoryRepository();
  const outbox = new TransactionalInMemoryOutboxRepository();
  const categoryGateway = new FakeCategoryGateway({ 1: { id: 1, name: 'Frenos', active: true } });
  const useCase = makeCreateUseCase({ repository, outbox, categoryGateway });

  const saved = await useCase.execute({
    userId: OWNER_ID,
    userEmail: 'juan@taller.com',
    token: 'jwt-de-juan',
    data: {
      categoryId: 1,
      vehicleBrand: 'Toyota',
      vehicleModel: 'Hilux',
      vehicleYear: 2019,
      description: 'Filtro de aceite',
      city: 'La Paz',
      urgency: 'ALTA',
    },
  });

  assert.equal(saved.status, 'PUBLISHED');
  assert.deepEqual(categoryGateway.calledWith, [{ categoryId: 1, token: 'jwt-de-juan' }]);
  assert.equal(outbox.committed.length, 1);

  const envelope = outbox.committed[0];
  assert.equal(envelope._exchange, Topic.PART_REQUEST);
  assert.equal(envelope._routingKey, PartRequestEvent.CREATED);
  assert.equal(envelope.event_name, PartRequestEvent.CREATED);
  assert.equal(envelope.version, 1);
  assert.equal(typeof envelope.event_id, 'string');
  assert.deepEqual(envelope.payload, {
    part_request_id: 1,
    buyer_id: OWNER_ID,
    category_id: 1,
    category_name: 'Frenos',
    vehicle_label: 'Toyota Hilux 2019',
    description: 'Filtro de aceite',
    city: 'La Paz',
    urgency: 'ALTA',
  });
});

test('categoria inexistente → CategoryNotFoundException (400), nada se guarda', async () => {
  const repository = new TransactionalInMemoryRepository();
  const outbox = new TransactionalInMemoryOutboxRepository();
  const useCase = makeCreateUseCase({ repository, outbox, categoryGateway: new FakeCategoryGateway({}) });

  await assert.rejects(
    useCase.execute({
      userId: OWNER_ID,
      data: {
        categoryId: 999,
        vehicleBrand: 'Toyota',
        vehicleModel: 'Hilux',
        vehicleYear: 2019,
        description: 'Filtro de aceite',
        city: 'La Paz',
      },
    }),
    (err) => {
      assert.equal(err.name, 'CategoryNotFoundException');
      return true;
    }
  );
  assert.equal(repository.committedRows.length, 0);
});

test('categoria desactivada → CategoryInactiveException (422), nada se guarda', async () => {
  const repository = new TransactionalInMemoryRepository();
  const outbox = new TransactionalInMemoryOutboxRepository();
  const categoryGateway = new FakeCategoryGateway({ 1: { id: 1, name: 'Frenos', active: false } });
  const useCase = makeCreateUseCase({ repository, outbox, categoryGateway });

  await assert.rejects(
    useCase.execute({
      userId: OWNER_ID,
      data: {
        categoryId: 1,
        vehicleBrand: 'Toyota',
        vehicleModel: 'Hilux',
        vehicleYear: 2019,
        description: 'Filtro de aceite',
        city: 'La Paz',
      },
    }),
    (err) => {
      assert.equal(err.name, 'CategoryInactiveException');
      return true;
    }
  );
  assert.equal(repository.committedRows.length, 0);
});

test('si falla el outbox al crear, la solicitud tampoco queda guardada', async () => {
  const repository = new TransactionalInMemoryRepository();
  const outbox = new TransactionalInMemoryOutboxRepository();
  outbox.failNext = true;
  const useCase = makeCreateUseCase({ repository, outbox });

  await assert.rejects(
    useCase.execute({
      userId: OWNER_ID,
      userEmail: 'juan@taller.com',
      data: {
        categoryId: 1,
        vehicleBrand: 'Toyota',
        vehicleModel: 'Hilux',
        vehicleYear: 2019,
        description: 'Filtro de aceite',
        city: 'La Paz',
        urgency: 'ALTA',
      },
    })
  );

  assert.equal(repository.committedRows.length, 0, 'nada quedó persistido');
});

test('consultar solicitud inexistente → PartRequestNotFoundException (404)', async () => {
  const query = new GetPartRequestById({
    partRequestRepository: new TransactionalInMemoryRepository(),
    supplierRepository: new FakeSupplierRepository(),
  });
  await assert.rejects(query.execute(42), (err) => {
    assert.equal(err.name, 'PartRequestNotFoundException');
    return true;
  });
});

test('el dueño puede ver el detalle', async () => {
  const query = new GetPartRequestById({
    partRequestRepository: new TransactionalInMemoryRepository([seedRequest()]),
    supplierRepository: new FakeSupplierRepository(),
  });
  const result = await query.execute(7, { requesterId: OWNER_ID });
  assert.equal(result.id, 7);
});

test('un proveedor APROBADO puede ver el detalle aunque no sea el dueño', async () => {
  const query = new GetPartRequestById({
    partRequestRepository: new TransactionalInMemoryRepository([seedRequest()]),
    supplierRepository: new FakeSupplierRepository({ 55: { approved: true } }),
  });
  const result = await query.execute(7, { requesterId: 55 });
  assert.equal(result.id, 7);
});

test('ni dueño ni proveedor aprobado → ForbiddenException (403)', async () => {
  const query = new GetPartRequestById({
    partRequestRepository: new TransactionalInMemoryRepository([seedRequest()]),
    supplierRepository: new FakeSupplierRepository({ 60: { approved: false } }),
  });
  await assert.rejects(query.execute(7, { requesterId: 60 }), (err) => {
    assert.equal(err.name, 'ForbiddenException');
    return true;
  });
});
