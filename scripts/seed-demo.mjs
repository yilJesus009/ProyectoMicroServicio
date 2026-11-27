#!/usr/bin/env node
/**
 * Deja datos listos para la demo contra el Gateway. Reejecutable: reutiliza
 * usuarios, perfiles, vehículo y solicitudes que ya estén en el estado
 * correcto; solo crea lo que falte.
 *
 * Uso: node scripts/seed-demo.mjs
 * Requiere Docker arriba (docker compose up --build) y .env con ADMIN_EMAIL
 * y ADMIN_PASSWORD. Variable opcional: API_BASE (por defecto
 * http://localhost:4000/api/v1).
 *
 * docs/defensa/guion-demo.md asume, tal cual los deja este archivo: la
 * solicitud id 1 (abierta, 2 ofertas), el pedido 1 (PENDING_PAYMENT) y el
 * pedido 2 (PREPARING) de comprador@demo.bo / proveedor1@demo.bo /
 * proveedor2@demo.bo. Esos tres usuarios, su orden de creación y los montos
 * NO cambian: lo nuevo se agrega después (docs/seed-demo.md).
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

// Contraseña de todos los usuarios de demo. Documentada también en el README.
const DEMO_PASSWORD = 'Demo12345!';

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

async function ensureUser(nombre, email, rol, ciudad = 'Santa Cruz') {
  const register = await api('POST', '/auth/register', {
    json: { nombre, email, contrasena: DEMO_PASSWORD, telefono: '70000000', ciudad, rol },
  });
  assert(
    register.status === 201 || register.status === 409,
    `registro de ${email} esperaba 201 o 409, llegó ${register.status}: ${JSON.stringify(register.body)}`
  );

  const login = await api('POST', '/auth/login', { json: { email, contrasena: DEMO_PASSWORD } });
  assert(login.status === 200, `login de ${email} esperaba 200, llegó ${login.status}`);
  return { token: login.body.data.token, userId: login.body.data.usuario.id, email };
}

async function ensureSupplierProfile(token, businessName, categoryIds, city = 'Santa Cruz') {
  const existing = await api('GET', '/suppliers/me', { token });
  if (existing.status === 200) return existing.body.data;
  assert(existing.status === 404, `GET /suppliers/me esperaba 200 o 404, llegó ${existing.status}`);

  const created = await api('PUT', '/suppliers/me', {
    token,
    json: { business_name: businessName, city, phone: '70000001', category_ids: categoryIds },
  });
  assert(created.status === 200, `PUT /suppliers/me esperaba 200, llegó ${created.status}: ${JSON.stringify(created.body)}`);
  return created.body.data;
}

async function ensureApproved(profile, adminToken) {
  if (profile.status === 'APPROVED') return profile;
  if (profile.status !== 'PENDING') {
    console.warn(`  (perfil ${profile.id} está en ${profile.status}, no se aprueba automáticamente)`);
    return profile;
  }
  const approved = await api('POST', `/admin/suppliers/${profile.id}/approve`, { token: adminToken });
  assert(approved.status === 200, `approve esperaba 200, llegó ${approved.status}: ${JSON.stringify(approved.body)}`);
  return { ...profile, status: 'APPROVED' };
}

async function ensureVehicle(comprador) {
  const mine = await api('GET', '/vehicles/mine', { token: comprador.token });
  assert(mine.status === 200, `GET /vehicles/mine esperaba 200, llegó ${mine.status}`);
  if (mine.body.data.length > 0) return mine.body.data[0];

  const created = await api('POST', '/vehicles', {
    token: comprador.token,
    json: { brand: 'Toyota', model: 'Corolla', year: 2018 },
  });
  assert(created.status === 201, `POST /vehicles esperaba 201, llegó ${created.status}: ${JSON.stringify(created.body)}`);
  return created.body.data;
}

async function createPartRequest(comprador, categoryId, description) {
  const form = new FormData();
  form.set('category_id', String(categoryId));
  form.set('vehicle_brand', 'Toyota');
  form.set('vehicle_model', 'Corolla');
  form.set('vehicle_year', '2018');
  form.set('description', description);
  form.set('city', 'Santa Cruz');
  form.set('urgency', 'MEDIA');
  form.set('photo', new Blob([TEST_PHOTO], { type: 'image/png' }), 'foto.png');

  const res = await api('POST', '/part-requests', { token: comprador.token, form });
  assert(res.status === 201, `POST /part-requests esperaba 201, llegó ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body.data;
}

async function submitOffer(partRequestId, supplier, price) {
  const res = await api('POST', `/part-requests/${partRequestId}/offers`, {
    token: supplier.token,
    json: {
      price,
      brand: 'KYB',
      condition: 'NEW',
      availability: 'IN_STOCK',
      delivery_type: 'DELIVERY',
      estimated_days: 2,
    },
  });
  assert(res.status === 201, `POST .../offers esperaba 201, llegó ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body.data;
}

/** Ofertas de proveedor1 y proveedor2 sobre una solicitud; crea las que falten. */
async function ensureTwoOffers(partRequestId, comprador, proveedor1, proveedor2) {
  const list = await api('GET', `/part-requests/${partRequestId}/offers`, { token: comprador.token });
  assert(list.status === 200, `GET .../offers esperaba 200, llegó ${list.status}`);
  const offers = list.body.data;

  let offer1 = offers.find((o) => o.supplier_id === proveedor1.userId);
  if (!offer1) offer1 = await submitOffer(partRequestId, proveedor1, 620.0);

  let offer2 = offers.find((o) => o.supplier_id === proveedor2.userId);
  if (!offer2) offer2 = await submitOffer(partRequestId, proveedor2, 700.0);

  return { offer1, offer2 };
}

async function getAcceptedOfferAndOrder(partRequestId, comprador) {
  const list = await api('GET', `/part-requests/${partRequestId}/offers`, { token: comprador.token });
  assert(list.status === 200, `GET .../offers esperaba 200, llegó ${list.status}`);
  const accepted = list.body.data.find((o) => o.status === 'ACCEPTED');
  if (!accepted) return { accepted: null, order: null };

  const order = await api('GET', `/orders/by-offer/${accepted.id}`, { token: comprador.token });
  if (order.status === 404) return { accepted, order: null };
  assert(order.status === 200, `GET /orders/by-offer esperaba 200 o 404, llegó ${order.status}`);
  return { accepted, order: order.body.data };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForOrder(offerId, comprador, { timeoutMs = 15000, intervalMs = 1000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await api('GET', `/orders/by-offer/${offerId}`, { token: comprador.token });
    if (res.status === 200) return res.body.data;
    await sleep(intervalMs);
  }
  throw new Error(`tiempo agotado esperando el pedido de la oferta ${offerId}`);
}

/**
 * Busca, entre las solicitudes del comprador, una que ya esté en el estado
 * pedido para la demo (abierta / aceptada sin pagar / pagada). Si no hay
 * ninguna, crea una nueva y la lleva a ese estado.
 */
async function ensureDemoScenario(kind, { comprador, proveedor1, proveedor2, categoryId }) {
  const mine = await api('GET', '/part-requests/mine', { token: comprador.token });
  assert(mine.status === 200, `GET /part-requests/mine esperaba 200, llegó ${mine.status}`);

  if (kind === 'open') {
    const candidate = mine.body.data.find((pr) => pr.status === 'PUBLISHED' || pr.status === 'RECEIVING_OFFERS');
    const partRequest = candidate || (await createPartRequest(comprador, categoryId, 'Pastillas de freno delanteras (demo)'));
    const { offer1, offer2 } = await ensureTwoOffers(partRequest.id, comprador, proveedor1, proveedor2);
    return { partRequest, offer1, offer2 };
  }

  if (kind === 'pendingPayment') {
    for (const pr of mine.body.data.filter((p) => p.status === 'OFFER_ACCEPTED')) {
      const { accepted, order } = await getAcceptedOfferAndOrder(pr.id, comprador);
      if (order && order.status === 'PENDING_PAYMENT') return { partRequest: pr, offer: accepted, order };
    }
    const partRequest = await createPartRequest(comprador, categoryId, 'Amortiguador delantero derecho (demo)');
    const { offer1 } = await ensureTwoOffers(partRequest.id, comprador, proveedor1, proveedor2);
    const accept = await api('POST', `/offers/${offer1.id}/accept`, { token: comprador.token });
    assert(accept.status === 200, `accept esperaba 200, llegó ${accept.status}: ${JSON.stringify(accept.body)}`);
    const order = await waitForOrder(offer1.id, comprador);
    return { partRequest, offer: offer1, order };
  }

  if (kind === 'preparing') {
    for (const pr of mine.body.data.filter((p) => p.status === 'OFFER_ACCEPTED')) {
      const { accepted, order } = await getAcceptedOfferAndOrder(pr.id, comprador);
      if (order && order.status === 'PREPARING') return { partRequest: pr, offer: accepted, order };
    }
    const partRequest = await createPartRequest(comprador, categoryId, 'Batería 12V 60Ah (demo)');
    const { offer1 } = await ensureTwoOffers(partRequest.id, comprador, proveedor1, proveedor2);
    const accept = await api('POST', `/offers/${offer1.id}/accept`, { token: comprador.token });
    assert(accept.status === 200, `accept esperaba 200, llegó ${accept.status}: ${JSON.stringify(accept.body)}`);
    const created = await waitForOrder(offer1.id, comprador);
    const paid = await api('POST', `/orders/${created.id}/payment`, { token: comprador.token, json: { method: 'QR' } });
    assert(paid.status === 200, `pago esperaba 200, llegó ${paid.status}: ${JSON.stringify(paid.body)}`);
    return { partRequest, offer: offer1, order: paid.body.data };
  }

  throw new Error(`escenario desconocido: ${kind}`);
}

// ---------------------------------------------------------------------------
// Extensión para la presentación: un tercer proveedor (3 ciudades) y un
// segundo comprador con su propio vehículo. Se agrega DESPUÉS de lo de
// arriba a propósito, para no mover los ids que ya usa
// docs/defensa/guion-demo.md.
// ---------------------------------------------------------------------------

/** Id de una categoría por su nombre exacto (tal como está hoy en Catálogo). */
async function getCategoryIdByName(token, name) {
  const res = await api('GET', '/categories', { token });
  assert(res.status === 200, `GET /categories esperaba 200, llegó ${res.status}`);
  const found = res.body.data.find((c) => c.name === name);
  assert(found, `no se encontró la categoría '${name}' en /categories`);
  return found.id;
}

async function ensureVehicleFor(comprador, brand, model, year) {
  const mine = await api('GET', '/vehicles/mine', { token: comprador.token });
  assert(mine.status === 200, `GET /vehicles/mine esperaba 200, llegó ${mine.status}`);
  const existing = mine.body.data.find((v) => v.brand === brand && v.model === model && v.year === year);
  if (existing) return existing;

  const created = await api('POST', '/vehicles', { token: comprador.token, json: { brand, model, year } });
  assert(created.status === 201, `POST /vehicles esperaba 201, llegó ${created.status}: ${JSON.stringify(created.body)}`);
  return created.body.data;
}

/** Tercer proveedor (La Paz) y segundo comprador con su propio vehículo. */
async function ensureExtraSuppliersAndBuyers({ admin }) {
  console.log('Creando / reutilizando tercer proveedor y segundo comprador...');
  const proveedor3 = await ensureUser('AutoPartes Lara', 'proveedor3@demo.bo', 'PROVEEDOR', 'La Paz');
  const comprador2 = await ensureUser('Luis Comprador', 'comprador2@demo.bo', 'COMPRADOR', 'Cochabamba');

  const categoryIds = {
    motor: await getCategoryIdByName(admin.token, 'Motor'),
    suspension: await getCategoryIdByName(admin.token, 'Suspensión'),
    electrico: await getCategoryIdByName(admin.token, 'Sistema eléctrico'),
    carroceria: await getCategoryIdByName(admin.token, 'Carrocería'),
  };

  let profile3 = await ensureSupplierProfile(proveedor3.token, 'AutoPartes Lara', Object.values(categoryIds), 'La Paz');
  profile3 = await ensureApproved(profile3, admin.token);

  const vehiculo2 = await ensureVehicleFor(comprador2, 'Suzuki', 'Swift', 2020);

  return { proveedor3, comprador2, vehiculo2, categoryIds };
}

async function findPartRequestByDescription(comprador, description) {
  const mine = await api('GET', '/part-requests/mine', { token: comprador.token });
  assert(mine.status === 200, `GET /part-requests/mine esperaba 200, llegó ${mine.status}`);
  return mine.body.data.find((pr) => pr.description === description) ?? null;
}

async function createPartRequestFor(comprador, vehicle, categoryId, description, city, urgency) {
  const form = new FormData();
  form.set('category_id', String(categoryId));
  form.set('vehicle_brand', vehicle.brand);
  form.set('vehicle_model', vehicle.model);
  form.set('vehicle_year', String(vehicle.year));
  form.set('description', description);
  form.set('city', city);
  form.set('urgency', urgency);
  form.set('photo', new Blob([TEST_PHOTO], { type: 'image/png' }), 'foto.png');

  const res = await api('POST', '/part-requests', { token: comprador.token, form });
  assert(res.status === 201, `POST /part-requests esperaba 201, llegó ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body.data;
}

async function ensurePartRequestFor(comprador, vehicle, categoryId, description, city, urgency) {
  const existing = await findPartRequestByDescription(comprador, description);
  if (existing) return existing;
  return createPartRequestFor(comprador, vehicle, categoryId, description, city, urgency);
}

async function listOffers(partRequestId, comprador) {
  const res = await api('GET', `/part-requests/${partRequestId}/offers`, { token: comprador.token });
  assert(res.status === 200, `GET .../offers esperaba 200, llegó ${res.status}`);
  return res.body.data;
}

async function submitOfferAs(partRequestId, supplier, price, deliveryType) {
  const res = await api('POST', `/part-requests/${partRequestId}/offers`, {
    token: supplier.token,
    json: {
      price,
      brand: 'KYB',
      condition: 'NEW',
      availability: 'IN_STOCK',
      delivery_type: deliveryType,
      estimated_days: 2,
    },
  });
  assert(res.status === 201, `POST .../offers esperaba 201, llegó ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body.data;
}

/** Deja en la solicitud una oferta por cada proveedor de `suppliers` que aún no tenga una. */
async function ensureOffersFrom(partRequest, comprador, suppliers, basePrice, deliveryType = 'DELIVERY') {
  const offers = await listOffers(partRequest.id, comprador);
  const result = [];
  for (const [index, supplier] of suppliers.entries()) {
    let offer = offers.find((o) => o.supplier_id === supplier.userId);
    if (!offer) offer = await submitOfferAs(partRequest.id, supplier, basePrice + index * 80, deliveryType);
    result.push(offer);
  }
  return result;
}

async function acceptFirstOffer(partRequest, comprador, offers) {
  const existing = await getAcceptedOfferAndOrder(partRequest.id, comprador);
  if (existing.accepted) return existing.accepted;

  const res = await api('POST', `/offers/${offers[0].id}/accept`, { token: comprador.token });
  assert(res.status === 200, `accept esperaba 200, llegó ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body.data.offer;
}

/**
 * Lleva una solicitud con una oferta ya aceptada hasta el estado objetivo del
 * pedido, avanzando solo lo que falte (idempotente entre corridas).
 */
async function advanceOrderTo(partRequest, comprador, supplier, targetStatus) {
  let { accepted, order } = await getAcceptedOfferAndOrder(partRequest.id, comprador);
  assert(accepted, `la solicitud ${partRequest.id} debía tener una oferta aceptada`);
  if (!order) order = await waitForOrder(accepted.id, comprador);

  const steps = ['PENDING_PAYMENT', 'PREPARING', order.delivery_type === 'PICKUP' ? 'READY_FOR_PICKUP' : 'IN_TRANSIT', 'DELIVERED'];
  const currentIndex = steps.indexOf(order.status);
  const targetIndex = steps.indexOf(targetStatus);
  assert(currentIndex >= 0 && targetIndex >= 0, `estado de pedido inesperado: actual ${order.status}, objetivo ${targetStatus}`);

  for (let i = currentIndex; i < targetIndex; i += 1) {
    const nextStatus = steps[i + 1];
    if (nextStatus === 'PREPARING') {
      const paid = await api('POST', `/orders/${order.id}/payment`, { token: comprador.token, json: { method: 'QR' } });
      assert(paid.status === 200, `pago esperaba 200, llegó ${paid.status}: ${JSON.stringify(paid.body)}`);
      order = paid.body.data;
    } else {
      const advanced = await api('PATCH', `/orders/${order.id}/status`, { token: supplier.token, json: { status: nextStatus } });
      assert(advanced.status === 200, `avanzar a ${nextStatus} esperaba 200, llegó ${advanced.status}: ${JSON.stringify(advanced.body)}`);
      order = advanced.body.data;
    }
  }
  return { offer: accepted, order };
}

/** Solicitudes de ejemplo: sin ofertas, con 3 ofertas, lista para retiro y entregada. */
async function ensureExtraScenarios({ proveedor1, proveedor2, proveedor3, comprador2, vehiculo2, categoryIds }) {
  console.log('Solicitud sin ofertas (demo)...');
  const sinOfertas = await ensurePartRequestFor(
    comprador2,
    vehiculo2,
    categoryIds.motor,
    'Bomba de agua del motor (demo sin ofertas)',
    'Cochabamba',
    'BAJA'
  );

  console.log('Solicitud con 3 ofertas (demo)...');
  const tresOfertas = await ensurePartRequestFor(
    comprador2,
    vehiculo2,
    categoryIds.suspension,
    'Amortiguadores delanteros (demo 3 ofertas)',
    'Cochabamba',
    'ALTA'
  );
  await ensureOffersFrom(tresOfertas, comprador2, [proveedor1, proveedor2, proveedor3], 600);

  console.log('Solicitud lista para retiro con pago confirmado (demo)...');
  const listoRetiro = await ensurePartRequestFor(
    comprador2,
    vehiculo2,
    categoryIds.electrico,
    'Alternador 90A (demo listo para retiro)',
    'Cochabamba',
    'ALTA'
  );
  const ofertasListoRetiro = await ensureOffersFrom(listoRetiro, comprador2, [proveedor3], 850, 'PICKUP');
  await acceptFirstOffer(listoRetiro, comprador2, ofertasListoRetiro);
  const resultadoListoRetiro = await advanceOrderTo(listoRetiro, comprador2, proveedor3, 'READY_FOR_PICKUP');

  console.log('Solicitud entregada (demo)...');
  const entregada = await ensurePartRequestFor(
    comprador2,
    vehiculo2,
    categoryIds.carroceria,
    'Espejo retrovisor derecho (demo entregada)',
    'Cochabamba',
    'MEDIA'
  );
  const ofertasEntregada = await ensureOffersFrom(entregada, comprador2, [proveedor1], 320, 'DELIVERY');
  await acceptFirstOffer(entregada, comprador2, ofertasEntregada);
  const resultadoEntregada = await advanceOrderTo(entregada, comprador2, proveedor1, 'DELIVERED');

  return {
    sinOfertas,
    tresOfertas,
    listoRetiro: { partRequest: listoRetiro, order: resultadoListoRetiro.order },
    entregada: { partRequest: entregada, order: resultadoEntregada.order },
  };
}

async function main() {
  assert(ADMIN_EMAIL && ADMIN_PASSWORD, 'faltan ADMIN_EMAIL / ADMIN_PASSWORD en el .env');

  console.log('Creando / reutilizando usuarios de demo...');
  const comprador = await ensureUser('Comprador Demo', 'comprador@demo.bo', 'COMPRADOR');
  const proveedor1 = await ensureUser('Repuestos Demo Uno', 'proveedor1@demo.bo', 'PROVEEDOR');
  const proveedor2 = await ensureUser('Repuestos Demo Dos', 'proveedor2@demo.bo', 'PROVEEDOR');

  const adminLogin = await api('POST', '/auth/login', { json: { email: ADMIN_EMAIL, contrasena: ADMIN_PASSWORD } });
  assert(adminLogin.status === 200, `login admin esperaba 200, llegó ${adminLogin.status}`);
  const admin = { token: adminLogin.body.data.token };

  const categories = await api('GET', '/categories', { token: comprador.token });
  assert(categories.status === 200 && categories.body.data.length > 0, 'no hay categorías activas en el catálogo');
  const categoryIds = categories.body.data.slice(0, Math.min(3, categories.body.data.length)).map((c) => c.id);
  const mainCategoryId = categoryIds[0];

  console.log('Asegurando perfiles comerciales aprobados...');
  let profile1 = await ensureSupplierProfile(proveedor1.token, 'Repuestos Demo Uno', categoryIds);
  profile1 = await ensureApproved(profile1, admin.token);
  let profile2 = await ensureSupplierProfile(proveedor2.token, 'Repuestos Demo Dos', categoryIds);
  profile2 = await ensureApproved(profile2, admin.token);

  console.log('Asegurando vehículo del comprador...');
  const vehicle = await ensureVehicle(comprador);

  const ctx = { comprador, proveedor1, proveedor2, categoryId: mainCategoryId };
  console.log('Asegurando solicitud abierta con dos ofertas...');
  const open = await ensureDemoScenario('open', ctx);
  console.log('Asegurando solicitud aceptada con pedido pendiente de pago...');
  const pendingPayment = await ensureDemoScenario('pendingPayment', ctx);
  console.log('Asegurando solicitud con pedido pagado (PREPARING)...');
  const preparing = await ensureDemoScenario('preparing', ctx);

  const { proveedor3, comprador2, vehiculo2, categoryIds: extraCategoryIds } = await ensureExtraSuppliersAndBuyers({
    admin,
  });
  const extra = await ensureExtraScenarios({
    proveedor1,
    proveedor2,
    proveedor3,
    comprador2,
    vehiculo2,
    categoryIds: extraCategoryIds,
  });

  console.log('\n================ Usuarios de demo ================');
  console.table([
    { rol: 'ADMIN', email: ADMIN_EMAIL, contrasena: '(la del .env)' },
    { rol: 'COMPRADOR', email: comprador.email, contrasena: DEMO_PASSWORD },
    { rol: 'COMPRADOR', email: comprador2.email, contrasena: DEMO_PASSWORD },
    { rol: 'PROVEEDOR', email: proveedor1.email, contrasena: DEMO_PASSWORD },
    { rol: 'PROVEEDOR', email: proveedor2.email, contrasena: DEMO_PASSWORD },
    { rol: 'PROVEEDOR', email: proveedor3.email, contrasena: DEMO_PASSWORD },
  ]);
  console.log('====================================================');
  console.log(
    `Solicitud abierta (lista para aceptar): id ${open.partRequest.id} — ofertas ${open.offer1.id} y ${open.offer2.id}`
  );
  console.log(
    `Solicitud aceptada, pedido pendiente de pago: solicitud ${pendingPayment.partRequest.id} — pedido ${pendingPayment.order.id}`
  );
  console.log(
    `Solicitud aceptada, pedido pagado (PREPARING): solicitud ${preparing.partRequest.id} — pedido ${preparing.order.id} — referencia ${preparing.order.payment?.reference}`
  );
  console.log(`Solicitud sin ofertas: id ${extra.sinOfertas.id}`);
  console.log(`Solicitud con 3 ofertas: id ${extra.tresOfertas.id}`);
  console.log(
    `Solicitud lista para retiro, pago confirmado: solicitud ${extra.listoRetiro.partRequest.id} — pedido ${extra.listoRetiro.order.id} (${extra.listoRetiro.order.status})`
  );
  console.log(
    `Solicitud entregada: solicitud ${extra.entregada.partRequest.id} — pedido ${extra.entregada.order.id} (${extra.entregada.order.status})`
  );
  console.log('======================================================');
}

main();
