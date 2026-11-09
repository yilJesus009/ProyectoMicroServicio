'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { validateCreateRequestDto, validateOpenFilters } = require('../../src/presentation/http/dto');

const validBody = {
  category_id: '1',
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
    categoryId: 1,
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

test('category_id ausente → ValidationException (400)', () => {
  const { category_id, ...withoutCategory } = validBody;
  assert.throws(() => validateCreateRequestDto(withoutCategory), (err) => {
    assert.equal(err.name, 'ValidationException');
    assert.match(err.message, /category_id/);
    return true;
  });
});

test('category_id no numérico → ValidationException (400)', () => {
  assert.throws(
    () => validateCreateRequestDto({ ...validBody, category_id: 'abc' }),
    (err) => {
      assert.equal(err.name, 'ValidationException');
      return true;
    }
  );
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

test('filtros de /open: category_id se valida como entero', () => {
  assert.deepEqual(validateOpenFilters({ city: 'La Paz', category_id: '1' }), {
    city: 'La Paz',
    categoryId: 1,
  });

  assert.throws(() => validateOpenFilters({ category_id: 'abc' }), (err) => {
    assert.equal(err.name, 'ValidationException');
    return true;
  });
});

test('filtros de /open sin query devuelve objeto vacío', () => {
  assert.deepEqual(validateOpenFilters(), {});
});
