'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  validateCreateRequestDto,
  validateStatusDto,
  validateSearchFilters,
} = require('../../src/presentation/http/dto');

const validBody = {
  vehicle_brand: 'Toyota',
  vehicle_model: 'Hilux',
  vehicle_year: '2019',
  description: 'Filtro de aceite',
  city: 'La Paz',
  urgency: 'ALTA',
};

test('DTO de creación válido se convierte a camelCase', () => {
  const data = validateCreateRequestDto(validBody);
  assert.deepEqual(data, {
    vehicleBrand: 'Toyota',
    vehicleModel: 'Hilux',
    vehicleYear: 2019,
    description: 'Filtro de aceite',
    city: 'La Paz',
    urgency: 'ALTA',
  });
});

test('campo obligatorio ausente → ValidationException (400)', () => {
  const { city, ...withoutCity } = validBody;
  assert.throws(() => validateCreateRequestDto(withoutCity), (err) => {
    assert.equal(err.name, 'ValidationException');
    assert.match(err.message, /city/);
    return true;
  });
});

test('urgency fuera del contrato (LOW/MEDIUM/HIGH) → ValidationException (400)', () => {
  assert.throws(
    () => validateCreateRequestDto({ ...validBody, urgency: 'HIGH' }),
    (err) => {
      assert.equal(err.name, 'ValidationException');
      assert.match(err.message, /BAJA \| MEDIA \| ALTA/);
      return true;
    }
  );
});

test('vehicle_year no numérico → ValidationException (400)', () => {
  assert.throws(
    () => validateCreateRequestDto({ ...validBody, vehicle_year: 'abc' }),
    (err) => {
      assert.equal(err.name, 'ValidationException');
      return true;
    }
  );
});

test('status desconocido → ValidationException (400)', () => {
  assert.throws(() => validateStatusDto({ status: 'IN_PROGRESS' }), (err) => {
    assert.equal(err.name, 'ValidationException');
    return true;
  });
  assert.throws(() => validateStatusDto({}), (err) => {
    assert.equal(err.name, 'ValidationException');
    return true;
  });
});

test('status válido del contrato pasa', () => {
  assert.equal(validateStatusDto({ status: 'ORDERED' }), 'ORDERED');
});

test('filtros de búsqueda validan los enums', () => {
  assert.deepEqual(validateSearchFilters({ city: 'La Paz', status: 'PUBLISHED' }), {
    city: 'La Paz',
    status: 'PUBLISHED',
  });

  assert.throws(() => validateSearchFilters({ urgency: 'HIGH' }), (err) => {
    assert.equal(err.name, 'ValidationException');
    return true;
  });
});
