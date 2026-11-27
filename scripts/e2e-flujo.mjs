#!/usr/bin/env node
/**
 * Recorre el flujo completo de docs/flujo-principal.md contra el Gateway,
 * con usuarios nuevos en cada corrida. Imprime ✓/✗ por paso y termina con
 * código 1 en el primer paso que falle (los siguientes dependen de sus datos).
 *
 * Uso: node scripts/e2e-flujo.mjs
 * Requiere Docker arriba (docker compose up --build) y .env con ADMIN_EMAIL
 * y ADMIN_PASSWORD. Variable opcional: API_BASE (por defecto
 * http://localhost:4000/api/v1).
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

function loadEnvFile() {
  const path = existsSync(join(repoRoot, '.env')) ? join(repoRoot, '.env') : join(repoRoot, '.env.example');
  const content = readFileSync(path, 'utf-8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].trim();
    }
  }
}
loadEnvFile();

const BASE = process.env.API_BASE || `http://localhost:${process.env.GATEWAY_PORT || 4000}/api/v1`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// PNG 1x1 válido, para no depender de un archivo externo.
const TEST_PHOTO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUAAScy0FUAAAAASUVORK5CYII=',
  'base64'
);

async function api(method, path, { token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (form) {
    body = form;
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body });
  let parsed = null;
  const text = await res.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { status: res.status, body: parsed };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(fn, { timeoutMs = 15000, intervalMs = 1000, label = '' } = {}) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (err) {
      lastError = err;
    }
    await sleep(intervalMs);
  }
  throw new Error(`tiempo agotado esperando ${label}${lastError ? ` (último error: ${lastError.message})` : ''}`);
}

let stepNumber = 0;
async function step(description, fn) {
  stepNumber += 1;
  const label = `${String(stepNumber).padStart(2, '0')} ${description}`;
  try {
    const result = await fn();
    console.log(`✓ ${label}`);
    return result;
  } catch (err) {
    console.error(`✗ ${label}: ${err.message}`);
    process.exit(1);
  }
}

async function registerAndLogin(nombre, email, rol, password) {
  const register = await api('POST', '/auth/register', {
    json: { nombre, email, contrasena: password, telefono: '70000000', ciudad: 'Santa Cruz', rol },
  });
  assert(register.status === 201, `registro esperaba 201, llegó ${register.status}: ${JSON.stringify(register.body)}`);

  const login = await api('POST', '/auth/login', { json: { email, contrasena: password } });
  assert(login.status === 200, `login esperaba 200, llegó ${login.status}`);
  return { token: login.body.data.token, userId: login.body.data.usuario.id };
}

async function expectNotification(token, type, label) {
  await waitFor(
    async () => {
      const res = await api('GET', '/notifications/mine', { token });
      assert(res.status === 200, `GET /notifications/mine devolvió ${res.status}`);
      return res.body.data.some((n) => n.type === type);
    },
    { label: `aviso ${type} para ${label}` }
  );
}

async function main() {
  assert(ADMIN_EMAIL && ADMIN_PASSWORD, 'faltan ADMIN_EMAIL / ADMIN_PASSWORD en el .env');

  const ts = Date.now();
  const password = `E2eFlujo!${ts}`;
  const emails = {
    comprador: `comprador.${ts}@e2e.test`,
    proveedor1: `proveedor1.${ts}@e2e.test`,
    proveedor2: `proveedor2.${ts}@e2e.test`,
  };

  const comprador = await step('registro y login del comprador', () =>
    registerAndLogin('Comprador E2E', emails.comprador, 'COMPRADOR', password)
  );
  const proveedor1 = await step('registro y login del proveedor 1', () =>
    registerAndLogin('Proveedor Uno E2E', emails.proveedor1, 'PROVEEDOR', password)
  );
  const proveedor2 = await step('registro y login del proveedor 2', () =>
    registerAndLogin('Proveedor Dos E2E', emails.proveedor2, 'PROVEEDOR', password)
  );

  const admin = await step('login del admin', async () => {
    const res = await api('POST', '/auth/login', { json: { email: ADMIN_EMAIL, contrasena: ADMIN_PASSWORD } });
    assert(res.status === 200, `login admin esperaba 200, llegó ${res.status}`);
    return { token: res.body.data.token };
  });

  const categoryId = await step('obtener una categoría del catálogo', async () => {
    const res = await api('GET', '/categories', { token: comprador.token });
    assert(res.status === 200, `GET /categories esperaba 200, llegó ${res.status}`);
    assert(res.body.data.length > 0, 'no hay categorías activas en el catálogo');
    return res.body.data[0].id;
  });

  const profile1 = await step('proveedor 1 completa su perfil comercial', async () => {
    const res = await api('PUT', '/suppliers/me', {
      token: proveedor1.token,
      json: { business_name: 'Repuestos E2E Uno', city: 'Santa Cruz', phone: '70000001', category_ids: [categoryId] },
    });
    assert(res.status === 200, `PUT /suppliers/me esperaba 200, llegó ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.data.status === 'PENDING', `perfil debía nacer PENDING, llegó ${res.body.data.status}`);
    return res.body.data;
  });
  const profile2 = await step('proveedor 2 completa su perfil comercial', async () => {
    const res = await api('PUT', '/suppliers/me', {
      token: proveedor2.token,
      json: { business_name: 'Repuestos E2E Dos', city: 'Santa Cruz', phone: '70000002', category_ids: [categoryId] },
    });
    assert(res.status === 200, `PUT /suppliers/me esperaba 200, llegó ${res.status}`);
    return res.body.data;
  });

  await step('admin aprueba al proveedor 1', async () => {
    const res = await api('POST', `/admin/suppliers/${profile1.id}/approve`, { token: admin.token });
    assert(res.status === 200, `approve esperaba 200, llegó ${res.status}: ${JSON.stringify(res.body)}`);
  });
  await step('admin aprueba al proveedor 2', async () => {
    const res = await api('POST', `/admin/suppliers/${profile2.id}/approve`, { token: admin.token });
    assert(res.status === 200, `approve esperaba 200, llegó ${res.status}`);
  });

  await step('proveedor 1 recibe el aviso de aprobación', () =>
    expectNotification(proveedor1.token, 'SUPPLIER_APPROVED', 'proveedor 1')
  );

  const partRequest = await step('comprador publica una solicitud con foto', async () => {
    const form = new FormData();
    form.set('category_id', String(categoryId));
    form.set('vehicle_brand', 'Toyota');
    form.set('vehicle_model', 'Corolla');
    form.set('vehicle_year', '2018');
    form.set('description', 'Pastillas de freno delanteras (E2E)');
    form.set('city', 'Santa Cruz');
    form.set('urgency', 'ALTA');
    form.set('photo', new Blob([TEST_PHOTO], { type: 'image/png' }), 'foto.png');

    const res = await api('POST', '/part-requests', { token: comprador.token, form });
    assert(res.status === 201, `POST /part-requests esperaba 201, llegó ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.data.status === 'PUBLISHED', `solicitud debía nacer PUBLISHED, llegó ${res.body.data.status}`);
    return res.body.data;
  });

  const offer1 = await step('proveedor 1 ve la solicitud abierta y oferta', async () => {
    const open = await api('GET', `/part-requests/open?category_id=${categoryId}`, { token: proveedor1.token });
    assert(open.status === 200, `GET /part-requests/open esperaba 200, llegó ${open.status}`);
    assert(
      open.body.data.some((pr) => pr.id === partRequest.id),
      'la solicitud publicada no aparece en /part-requests/open'
    );

    const res = await api('POST', `/part-requests/${partRequest.id}/offers`, {
      token: proveedor1.token,
      json: {
        price: 620.0,
        brand: 'KYB',
        condition: 'NEW',
        availability: 'IN_STOCK',
        delivery_type: 'DELIVERY',
        estimated_days: 2,
      },
    });
    assert(res.status === 201, `POST .../offers esperaba 201, llegó ${res.status}: ${JSON.stringify(res.body)}`);
    return res.body.data;
  });

  const offer2 = await step('proveedor 2 oferta la misma solicitud', async () => {
    const res = await api('POST', `/part-requests/${partRequest.id}/offers`, {
      token: proveedor2.token,
      json: {
        price: 700.0,
        brand: 'Bosch',
        condition: 'NEW',
        availability: 'ON_ORDER',
        delivery_type: 'PICKUP',
        estimated_days: 4,
      },
    });
    assert(res.status === 201, `POST .../offers esperaba 201, llegó ${res.status}`);
    return res.body.data;
  });

  await step('comprador recibe avisos de las dos ofertas', () =>
    waitFor(
      async () => {
        const res = await api('GET', '/notifications/mine', { token: comprador.token });
        assert(res.status === 200, `GET /notifications/mine devolvió ${res.status}`);
        const count = res.body.data.filter((n) => n.type === 'OFFER_SUBMITTED').length;
        return count >= 2;
      },
      { label: '2 avisos OFFER_SUBMITTED para el comprador' }
    )
  );

  await step('comprador compara: ve las dos ofertas', async () => {
    const res = await api('GET', `/part-requests/${partRequest.id}/offers`, { token: comprador.token });
    assert(res.status === 200, `GET .../offers esperaba 200, llegó ${res.status}`);
    assert(res.body.data.length === 2, `esperaba 2 ofertas en el comparador, llegaron ${res.body.data.length}`);
  });

  await step('comprador acepta la oferta del proveedor 1', async () => {
    const res = await api('POST', `/offers/${offer1.id}/accept`, { token: comprador.token });
    assert(res.status === 200, `accept esperaba 200, llegó ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.data.offer.status === 'ACCEPTED', `oferta debía quedar ACCEPTED, llegó ${res.body.data.offer.status}`);
  });

  await step('negativo: aceptar la segunda oferta devuelve 409', async () => {
    const res = await api('POST', `/offers/${offer2.id}/accept`, { token: comprador.token });
    assert(res.status === 409, `esperaba 409, llegó ${res.status}: ${JSON.stringify(res.body)}`);
  });

  await step('proveedor 1 recibe aviso de oferta aceptada', () =>
    expectNotification(proveedor1.token, 'OFFER_ACCEPTED', 'proveedor 1')
  );
  await step('proveedor 2 recibe aviso de oferta rechazada', () =>
    expectNotification(proveedor2.token, 'OFFER_REJECTED', 'proveedor 2')
  );

  const order = await step('se crea el pedido a partir de OFFER_ACCEPTED', () =>
    waitFor(
      async () => {
        const res = await api('GET', `/orders/by-offer/${offer1.id}`, { token: comprador.token });
        if (res.status === 404) return null;
        assert(res.status === 200, `GET /orders/by-offer esperaba 200, llegó ${res.status}`);
        assert(res.body.data.status === 'PENDING_PAYMENT', `pedido debía nacer PENDING_PAYMENT, llegó ${res.body.data.status}`);
        return res.body.data;
      },
      { label: 'el pedido del evento OFFER_ACCEPTED' }
    )
  );

  await step('comprador recibe aviso de pedido creado', () =>
    expectNotification(comprador.token, 'ORDER_CREATED', 'comprador')
  );

  await step('negativo: pagar con card_number en el body devuelve 400', async () => {
    const res = await api('POST', `/orders/${order.id}/payment`, {
      token: comprador.token,
      json: { method: 'CARD', card_number: '4111111111111111' },
    });
    assert(res.status === 400, `esperaba 400, llegó ${res.status}: ${JSON.stringify(res.body)}`);
  });

  await step('comprador paga con QR', async () => {
    const res = await api('POST', `/orders/${order.id}/payment`, { token: comprador.token, json: { method: 'QR' } });
    assert(res.status === 200, `pago esperaba 200, llegó ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.data.status === 'PREPARING', `pedido debía quedar PREPARING, llegó ${res.body.data.status}`);
    assert(res.body.data.payment?.reference, 'el pago no trajo "reference"');
  });

  await step('negativo: pagar una segunda vez devuelve 409', async () => {
    const res = await api('POST', `/orders/${order.id}/payment`, { token: comprador.token, json: { method: 'QR' } });
    assert(res.status === 409, `esperaba 409, llegó ${res.status}: ${JSON.stringify(res.body)}`);
  });

  await step('proveedor 1 despacha el pedido (IN_TRANSIT)', async () => {
    const res = await api('PATCH', `/orders/${order.id}/status`, {
      token: proveedor1.token,
      json: { status: 'IN_TRANSIT' },
    });
    assert(res.status === 200, `PATCH status esperaba 200, llegó ${res.status}: ${JSON.stringify(res.body)}`);
  });

  await step('comprador recibe aviso de cambio de estado', () =>
    expectNotification(comprador.token, 'ORDER_STATUS_CHANGED', 'comprador')
  );

  await step('proveedor 1 marca el pedido entregado (DELIVERED)', async () => {
    const res = await api('PATCH', `/orders/${order.id}/status`, {
      token: proveedor1.token,
      json: { status: 'DELIVERED' },
    });
    assert(res.status === 200, `PATCH status esperaba 200, llegó ${res.status}`);
  });

  await step('comprador confirma la recepción', async () => {
    const res = await api('POST', `/orders/${order.id}/confirm-receipt`, { token: comprador.token });
    assert(res.status === 200, `confirm-receipt esperaba 200, llegó ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.data.status === 'COMPLETED', `pedido debía quedar COMPLETED, llegó ${res.body.data.status}`);
  });

  await step('la solicitud queda COMPLETED', () =>
    waitFor(
      async () => {
        const res = await api('GET', `/part-requests/${partRequest.id}`, { token: comprador.token });
        assert(res.status === 200, `GET part-request esperaba 200, llegó ${res.status}`);
        return res.body.data.status === 'COMPLETED' ? res.body.data : null;
      },
      { label: 'que la solicitud pase a COMPLETED' }
    )
  );

  console.log('\nTodo el flujo pasó correctamente.');
}

main();
