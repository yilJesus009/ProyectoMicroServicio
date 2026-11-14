'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { errorHandler } = require('../../src/presentation/http/errorHandler');

function fakeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

test('un error de dominio mapeado responde con su status y su mensaje', () => {
  const res = fakeRes();
  const err = new Error('Aviso inexistente');
  err.name = 'NotificationNotFoundException';

  errorHandler(err, {}, res, () => {});

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { status: 404, msg: 'Aviso inexistente', data: null });
});

test('revision fase 5, hallazgo 2: un JSON mal formado (SyntaxError con status 400 de body-parser) da 400, no 500', () => {
  const res = fakeRes();
  const err = new SyntaxError('Unexpected token m in JSON at position 1');
  err.status = 400; // asi lo marca body-parser, no por err.name

  errorHandler(err, {}, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.msg, 'El cuerpo de la petición no es JSON válido');
  assert.equal(res.body.data, null);
});

test('un error de libreria con statusCode 4xx tambien se respeta (no solo status)', () => {
  const res = fakeRes();
  const err = new Error('payload too large');
  err.statusCode = 413;

  errorHandler(err, {}, res, () => {});

  assert.equal(res.statusCode, 413);
  assert.equal(res.body.msg, 'Datos inválidos');
});

test('un error sin name mapeado y sin status de libreria sigue dando 500 sin exponer el detalle', () => {
  const res = fakeRes();
  const err = new Error('boom interno, detalle sensible');

  errorHandler(err, {}, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.msg, 'Error interno del servidor');
  assert.doesNotMatch(res.body.msg, /sensible/);
});
