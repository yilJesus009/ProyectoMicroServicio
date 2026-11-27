'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { validateCreateRequestDto, validateOpenFilters, validateSubmitOfferDto, validateOffersSort, parseIdParam } = require('../../src/presentation/http/dto');

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

const validOfferBody = {
  price: '620.00',
  brand: 'KYB',
  condition: 'NEW',
  availability: 'IN_STOCK',
  delivery_type: 'DELIVERY',
  estimated_days: '2',
};

test('DTO de oferta válido se convierte a camelCase', () => {
  assert.deepEqual(validateSubmitOfferDto(validOfferBody), {
    price: 620,
    brand: 'KYB',
    condition: 'NEW',
    availability: 'IN_STOCK',
    deliveryType: 'DELIVERY',
    estimatedDays: 2,
    notes: null,
  });
});

test('oferta: price <= 0 → ValidationException (400)', () => {
  assert.throws(() => validateSubmitOfferDto({ ...validOfferBody, price: '0' }), (err) => {
    assert.equal(err.name, 'ValidationException');
    return true;
  });
  assert.throws(() => validateSubmitOfferDto({ ...validOfferBody, price: '-5' }), (err) => {
    assert.equal(err.name, 'ValidationException');
    return true;
  });
});

test('oferta: condition/availability/delivery_type fuera del contrato → ValidationException (400)', () => {
  assert.throws(() => validateSubmitOfferDto({ ...validOfferBody, condition: 'BROKEN' }), (err) => {
    assert.equal(err.name, 'ValidationException');
    return true;
  });
  assert.throws(() => validateSubmitOfferDto({ ...validOfferBody, availability: 'MAYBE' }), (err) => {
    assert.equal(err.name, 'ValidationException');
    return true;
  });
  assert.throws(() => validateSubmitOfferDto({ ...validOfferBody, delivery_type: 'TELEPORT' }), (err) => {
    assert.equal(err.name, 'ValidationException');
    return true;
  });
});

test('oferta: campo obligatorio ausente → ValidationException (400)', () => {
  const { brand, ...withoutBrand } = validOfferBody;
  assert.throws(() => validateSubmitOfferDto(withoutBrand), (err) => {
    assert.equal(err.name, 'ValidationException');
    assert.match(err.message, /brand/);
    return true;
  });
});

test('sort de ofertas: price | days validos, cualquier otro valor → ValidationException (400)', () => {
  assert.equal(validateOffersSort({ sort: 'price' }), 'price');
  assert.equal(validateOffersSort({ sort: 'days' }), 'days');
  assert.equal(validateOffersSort({}), undefined);
  assert.throws(() => validateOffersSort({ sort: 'rating' }), (err) => {
    assert.equal(err.name, 'ValidationException');
    return true;
  });
});

test('parseIdParam: entero positivo se acepta y se convierte a number', () => {
  assert.equal(parseIdParam('34'), 34);
  assert.equal(parseIdParam('1'), 1);
});

test('parseIdParam: no numerico, cero, negativo o decimal → ValidationException (400)', () => {
  for (const raw of ['abc', '0', '-1', '1.5', '', undefined]) {
    assert.throws(() => parseIdParam(raw, 'id'), (err) => {
      assert.equal(err.name, 'ValidationException');
      assert.match(err.message, /id/);
      return true;
    }, `esperaba que '${raw}' fallara`);
  }
});
