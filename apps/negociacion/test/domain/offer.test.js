'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { Offer } = require('../../src/domain/entities/offer');
const { OfferStatus, canTransitionOffer } = require('../../src/domain/enums');

const base = {
  partRequestId: 34,
  supplierId: 55,
  supplierName: 'AutoParts Center',
  price: 620,
  brand: 'KYB',
  condition: 'NEW',
  availability: 'IN_STOCK',
  deliveryType: 'DELIVERY',
  estimatedDays: 2,
};

test('nueva oferta nace SUBMITTED', () => {
  const offer = new Offer(base);
  assert.equal(offer.status, OfferStatus.SUBMITTED);
  assert.equal(offer.currency, 'BOB');
});

test('SUBMITTED puede pasar a ACCEPTED, REJECTED o WITHDRAWN', () => {
  assert.equal(canTransitionOffer(OfferStatus.SUBMITTED, OfferStatus.ACCEPTED), true);
  assert.equal(canTransitionOffer(OfferStatus.SUBMITTED, OfferStatus.REJECTED), true);
  assert.equal(canTransitionOffer(OfferStatus.SUBMITTED, OfferStatus.WITHDRAWN), true);
});

test('los estados terminales no aceptan ninguna transicion', () => {
  assert.equal(canTransitionOffer(OfferStatus.ACCEPTED, OfferStatus.REJECTED), false);
  assert.equal(canTransitionOffer(OfferStatus.REJECTED, OfferStatus.ACCEPTED), false);
  assert.equal(canTransitionOffer(OfferStatus.WITHDRAWN, OfferStatus.ACCEPTED), false);
});

test('changeStatus invalido lanza InvalidOfferTransitionException (→ 422)', () => {
  const offer = new Offer({ ...base, status: OfferStatus.ACCEPTED });
  assert.throws(() => offer.changeStatus(OfferStatus.REJECTED), (err) => {
    assert.equal(err.name, 'InvalidOfferTransitionException');
    return true;
  });
});

test('isOwnedBy compara el supplierId', () => {
  const offer = new Offer(base);
  assert.equal(offer.isOwnedBy(55), true);
  assert.equal(offer.isOwnedBy(999), false);
});
