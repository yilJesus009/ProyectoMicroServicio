'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { Supplier } = require('../../src/domain/entities/supplier');

test('Supplier.submitted nace sin aprobar', () => {
  const supplier = Supplier.submitted(55, 'AutoParts Center');
  assert.equal(supplier.supplierId, 55);
  assert.equal(supplier.approved, false);
});

test('Supplier.approved nace aprobado con ciudad y categorias', () => {
  const supplier = Supplier.approved(55, 'AutoParts Center', 'Santa Cruz', [1, 3]);
  assert.equal(supplier.approved, true);
  assert.equal(supplier.city, 'Santa Cruz');
  assert.deepEqual(supplier.categoryIds, [1, 3]);
});
