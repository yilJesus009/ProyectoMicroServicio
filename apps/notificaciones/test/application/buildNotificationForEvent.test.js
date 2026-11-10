'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { buildNotificationForEvent } = require('../../src/application/buildNotificationForEvent');

test('SUPPLIER_PROFILE_SUBMITTED: aviso para todos los ADMIN, con el nombre comercial', () => {
  const result = buildNotificationForEvent('SUPPLIER_PROFILE_SUBMITTED', {
    supplier_id: 55,
    business_name: 'AutoParts Center',
  });
  assert.equal(result.role, 'ADMIN');
  assert.equal(result.userId, undefined);
  assert.match(result.message, /AutoParts Center/);
  assert.equal(result.link, '/admin/proveedores');
});

test('SUPPLIER_APPROVED: aviso al proveedor', () => {
  const result = buildNotificationForEvent('SUPPLIER_APPROVED', {
    supplier_id: 55,
    business_name: 'AutoParts Center',
    city: 'Santa Cruz',
    category_ids: [1],
  });
  assert.equal(result.userId, 55);
  assert.match(result.message, /AutoParts Center/);
  assert.equal(result.link, '/proveedor/perfil');
});

test('SUPPLIER_REJECTED: aviso al proveedor con el motivo', () => {
  const result = buildNotificationForEvent('SUPPLIER_REJECTED', { supplier_id: 55, reason: 'Datos incompletos' });
  assert.equal(result.userId, 55);
  assert.match(result.message, /Datos incompletos/);
});

test('OFFER_SUBMITTED: mensaje concreto "Nueva oferta de X: precio moneda", al comprador', () => {
  const result = buildNotificationForEvent('OFFER_SUBMITTED', {
    offer_id: 78,
    part_request_id: 34,
    buyer_id: 7,
    supplier_id: 55,
    supplier_name: 'AutoParts Center',
    price: 620,
    currency: 'BOB',
  });
  assert.equal(result.userId, 7);
  assert.equal(result.message, 'Nueva oferta de AutoParts Center: 620 BOB');
  assert.equal(result.link, '/comprador/solicitudes/34');
});

test('OFFER_ACCEPTED: aviso al proveedor ganador con el precio', () => {
  const result = buildNotificationForEvent('OFFER_ACCEPTED', {
    offer_id: 78,
    part_request_id: 34,
    buyer_id: 7,
    supplier_id: 55,
    price: 620,
    currency: 'BOB',
  });
  assert.equal(result.userId, 55);
  assert.match(result.message, /620 BOB/);
});

test('OFFER_REJECTED: aviso al proveedor no elegido', () => {
  const result = buildNotificationForEvent('OFFER_REJECTED', {
    offer_id: 79,
    part_request_id: 34,
    supplier_id: 60,
    reason: 'NOT_SELECTED',
  });
  assert.equal(result.userId, 60);
  assert.equal(result.link, '/proveedor/ofertas');
});

test('ORDER_STATUS_CHANGED: PENDING_PAYMENT → PREPARING avisa al proveedor (pagó el comprador)', () => {
  const result = buildNotificationForEvent('ORDER_STATUS_CHANGED', {
    order_id: 12,
    part_request_id: 34,
    buyer_id: 7,
    supplier_id: 55,
    previous_status: 'PENDING_PAYMENT',
    new_status: 'PREPARING',
  });
  assert.equal(result.userId, 55);
  assert.match(result.message, /pagó el pedido #12/);
  assert.equal(result.link, '/proveedor/pedidos');
});

test('ORDER_STATUS_CHANGED: → IN_TRANSIT avisa al comprador', () => {
  const result = buildNotificationForEvent('ORDER_STATUS_CHANGED', {
    order_id: 12,
    buyer_id: 7,
    supplier_id: 55,
    previous_status: 'PREPARING',
    new_status: 'IN_TRANSIT',
  });
  assert.equal(result.userId, 7);
  assert.match(result.message, /en camino/);
  assert.equal(result.link, '/comprador/pedidos/12');
});

test('ORDER_STATUS_CHANGED: → READY_FOR_PICKUP avisa al comprador', () => {
  const result = buildNotificationForEvent('ORDER_STATUS_CHANGED', {
    order_id: 12,
    buyer_id: 7,
    supplier_id: 55,
    previous_status: 'PREPARING',
    new_status: 'READY_FOR_PICKUP',
  });
  assert.equal(result.userId, 7);
  assert.match(result.message, /listo para retirar/);
});

test('ORDER_STATUS_CHANGED: → DELIVERED avisa al comprador pidiéndole que confirme', () => {
  const result = buildNotificationForEvent('ORDER_STATUS_CHANGED', {
    order_id: 12,
    buyer_id: 7,
    supplier_id: 55,
    previous_status: 'IN_TRANSIT',
    new_status: 'DELIVERED',
  });
  assert.equal(result.userId, 7);
  assert.equal(result.message, 'Tu pedido #12 fue entregado. Confírmalo para cerrar la compra.');
  assert.equal(result.link, '/comprador/pedidos/12');
});

test('ORDER_STATUS_CHANGED: DELIVERED → COMPLETED avisa al proveedor (confirmó el comprador)', () => {
  const result = buildNotificationForEvent('ORDER_STATUS_CHANGED', {
    order_id: 12,
    buyer_id: 7,
    supplier_id: 55,
    previous_status: 'DELIVERED',
    new_status: 'COMPLETED',
  });
  assert.equal(result.userId, 55);
  assert.match(result.message, /confirmó la recepción/);
  assert.equal(result.link, '/proveedor/pedidos');
});

test('evento desconocido devuelve null', () => {
  assert.equal(buildNotificationForEvent('ALGO_RARO', {}), null);
});
