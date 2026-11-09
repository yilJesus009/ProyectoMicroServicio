#!/usr/bin/env node
// =============================================================================
// Prueba de concurrencia: aceptar dos ofertas a la vez (la regla critica)
// =============================================================================
// USO:
//   1. docker compose up -d  (o al menos postgres, rabbitmq, identidad,
//      catalogo, negociacion, gateway)
//   2. node scripts/prueba-concurrencia-aceptar.mjs
//
// Que hace: crea un comprador y dos proveedores, los aprueba publicando
// SUPPLIER_APPROVED a mano en RabbitMQ (igual que en Docker sin el admin de
// proveedores de Identidad todavia mergeado), crea una solicitud con dos
// ofertas, y lanza los dos POST /offers/{id}/accept EXACTAMENTE a la vez
// contra Postgres real. Verifica: un 200, un 409, y una sola oferta
// ACCEPTED en el comparador. Se puede volver a correr las veces que haga
// falta (usa emails con timestamp aleatorio).
// =============================================================================

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:4000/api/v1';
const RABBITMQ_API = process.env.RABBITMQ_MANAGEMENT_URL || 'http://localhost:15672';
const RABBITMQ_USER = process.env.RABBITMQ_USER || 'guest';
const RABBITMQ_PASS = process.env.RABBITMQ_PASS || 'guest';

const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

function log(msg) {
  console.log(`[prueba-concurrencia] ${msg}`);
}

async function api(method, path, { token, body, isForm } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${GATEWAY}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

async function registerAndLogin(rol, nombre) {
  const email = `${rol.toLowerCase()}.concurrencia.${suffix}.${Math.random().toString(36).slice(2)}@example.com`;
  const register = await api('POST', '/auth/register', {
    body: {
      nombre,
      email,
      contrasena: 'Clave123!',
      telefono: '70000000',
      ciudad: 'Santa Cruz',
      rol,
    },
  });
  if (register.status !== 201) {
    throw new Error(`No se pudo registrar ${rol} ${email}: ${JSON.stringify(register.body)}`);
  }
  const login = await api('POST', '/auth/login', { body: { email, contrasena: 'Clave123!' } });
  if (login.status !== 200) {
    throw new Error(`No se pudo loguear ${rol} ${email}: ${JSON.stringify(login.body)}`);
  }
  return { id: login.body.data.usuario.id, token: login.body.data.token };
}

/** Publica SUPPLIER_APPROVED a mano (docs/eventos.md), igual que en la verificacion manual. */
async function approveSupplier(supplierId, businessName) {
  const envelope = {
    event_id: crypto.randomUUID(),
    event_name: 'SUPPLIER_APPROVED',
    version: 1,
    occurred_at: new Date().toISOString(),
    correlation_id: crypto.randomUUID(),
    producer: 'identidad',
    payload: { supplier_id: supplierId, business_name: businessName, city: 'Santa Cruz', category_ids: [1] },
  };

  const auth = Buffer.from(`${RABBITMQ_USER}:${RABBITMQ_PASS}`).toString('base64');
  const res = await fetch(`${RABBITMQ_API}/api/exchanges/%2f/identity_events/publish`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { content_type: 'application/json', delivery_mode: 2 },
      routing_key: 'SUPPLIER_APPROVED',
      payload: JSON.stringify(envelope),
      payload_encoding: 'string',
    }),
  });
  const json = await res.json();
  if (!json.routed) throw new Error(`SUPPLIER_APPROVED no se enruto para supplier_id=${supplierId}`);
}

/** Espera a que el consumidor de negociacion haya aplicado la aprobacion. */
async function waitUntilApproved(token, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await api('GET', '/part-requests/open', { token });
    if (res.status === 200) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Timeout esperando SUPPLIER_APPROVED (revisa que negociacion y rabbitmq esten healthy)');
}

async function main() {
  log(`Gateway: ${GATEWAY} | RabbitMQ API: ${RABBITMQ_API}`);

  log('Registrando comprador y dos proveedores...');
  const buyer = await registerAndLogin('COMPRADOR', 'Comprador Concurrencia');
  const supplierA = await registerAndLogin('PROVEEDOR', 'Proveedor A');
  const supplierB = await registerAndLogin('PROVEEDOR', 'Proveedor B');

  log('Aprobando a ambos proveedores (SUPPLIER_APPROVED a mano)...');
  await approveSupplier(supplierA.id, 'Repuestos A');
  await approveSupplier(supplierB.id, 'Repuestos B');
  await waitUntilApproved(supplierA.token);
  await waitUntilApproved(supplierB.token);
  log('Ambos proveedores aprobados.');

  log('Creando la solicitud (categoria 1 = Frenos)...');
  const form = new FormData();
  form.set('category_id', '1');
  form.set('vehicle_brand', 'Toyota');
  form.set('vehicle_model', 'Corolla');
  form.set('vehicle_year', '2018');
  form.set('description', 'Pastillas de freno delanteras');
  form.set('city', 'Santa Cruz');
  const created = await api('POST', '/part-requests', { token: buyer.token, body: form, isForm: true });
  if (created.status !== 201) throw new Error(`No se pudo crear la solicitud: ${JSON.stringify(created.body)}`);
  const partRequestId = created.body.data.id;
  log(`Solicitud creada: id=${partRequestId}`);

  log('Enviando las dos ofertas...');
  const offerPayload = (price) => ({
    price,
    brand: 'KYB',
    condition: 'NEW',
    availability: 'IN_STOCK',
    delivery_type: 'DELIVERY',
    estimated_days: 2,
  });
  const offerA = await api('POST', `/part-requests/${partRequestId}/offers`, {
    token: supplierA.token,
    body: offerPayload(620),
  });
  const offerB = await api('POST', `/part-requests/${partRequestId}/offers`, {
    token: supplierB.token,
    body: offerPayload(700),
  });
  if (offerA.status !== 201 || offerB.status !== 201) {
    throw new Error(`No se pudieron crear las ofertas: ${JSON.stringify({ offerA: offerA.body, offerB: offerB.body })}`);
  }
  const offerIdA = offerA.body.data.id;
  const offerIdB = offerB.body.data.id;
  log(`Ofertas creadas: A=${offerIdA} (620 BOB), B=${offerIdB} (700 BOB)`);

  log('Lanzando los dos accept EXACTAMENTE a la vez...');
  const [acceptA, acceptB] = await Promise.all([
    api('POST', `/offers/${offerIdA}/accept`, { token: buyer.token, body: {} }),
    api('POST', `/offers/${offerIdB}/accept`, { token: buyer.token, body: {} }),
  ]);

  const statuses = [acceptA.status, acceptB.status].sort();
  log(`Resultado: accept(A)=${acceptA.status}, accept(B)=${acceptB.status}`);

  const checks = [];
  checks.push([
    'Exactamente un 200 y un 409',
    JSON.stringify(statuses) === JSON.stringify([200, 409]),
  ]);

  const comparador = await api('GET', `/part-requests/${partRequestId}/offers`, { token: buyer.token });
  const accepted = comparador.body.data.filter((o) => o.status === 'ACCEPTED');
  const rejected = comparador.body.data.filter((o) => o.status === 'REJECTED');
  checks.push(['Exactamente una oferta ACCEPTED en el comparador', accepted.length === 1]);
  checks.push(['La otra oferta quedo REJECTED', rejected.length === 1]);

  log('--- Resultado ---');
  let allPassed = true;
  for (const [name, passed] of checks) {
    log(`${passed ? 'OK ' : 'FALLO'} — ${name}`);
    if (!passed) allPassed = false;
  }

  if (!allPassed) {
    log(`Comparador completo: ${JSON.stringify(comparador.body.data, null, 2)}`);
    process.exit(1);
  }
  log('TODO PASO: la regla de una sola oferta aceptada se sostiene contra Postgres real.');
}

main().catch((error) => {
  console.error('[prueba-concurrencia] ERROR:', error.message);
  process.exit(1);
});
