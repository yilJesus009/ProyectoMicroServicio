import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { MetodoPago, PedidosFacade } from './pedidos.facade';

const URL = `${environment.apiUrl}/orders`;

const PEDIDO = {
  id: 12,
  offer_id: 78,
  part_request_id: 34,
  buyer_id: 7,
  supplier_id: 55,
  supplier_name: 'AutoParts Center',
  part_description: 'Amortiguador delantero derecho',
  vehicle_label: 'Toyota Corolla 2018',
  price: 620,
  currency: 'BOB',
  delivery_type: 'DELIVERY',
  estimated_days: 2,
  status: 'PENDING_PAYMENT',
  payment: null,
  history: [{ from_status: null, to_status: 'PENDING_PAYMENT', changed_at: '2026-11-10T14:00:00Z' }],
  created_at: '2026-11-10T14:00:00Z',
};

describe('PedidosFacade', () => {
  let http: HttpTestingController;
  let facade: PedidosFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    facade = TestBed.inject(PedidosFacade);
  });

  afterEach(() => http.verify());

  it('misPedidos pide GET /orders/mine', async () => {
    const peticion = facade.misPedidos();

    const req = http.expectOne(`${URL}/mine`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 200, msg: 'Pedidos encontrados', data: [PEDIDO] });

    expect((await peticion)[0].id).toBe(12);
  });

  it('delProveedor pide GET /orders/supplier', async () => {
    const peticion = facade.delProveedor();

    const req = http.expectOne(`${URL}/supplier`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 200, msg: 'Pedidos encontrados', data: [PEDIDO] });

    expect((await peticion).length).toBe(1);
  });

  it('detalle pide GET /orders/{id}', async () => {
    const peticion = facade.detalle(12);

    const req = http.expectOne(`${URL}/12`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 200, msg: 'Pedido encontrado', data: PEDIDO });

    expect((await peticion).status).toBe('PENDING_PAYMENT');
  });

  it('porOferta devuelve null en 404 (el pedido aún no existe) y sigue adelante', async () => {
    const peticion = facade.porOferta(78);

    const req = http.expectOne(`${URL}/by-offer/78`);
    req.flush(
      { status: 404, msg: 'Pedido no encontrado', data: null },
      { status: 404, statusText: 'Not Found' },
    );

    expect(await peticion).toBeNull();
  });

  it('porOferta devuelve el pedido cuando ya se creó', async () => {
    const peticion = facade.porOferta(78);

    const req = http.expectOne(`${URL}/by-offer/78`);
    req.flush({ status: 200, msg: 'Pedido encontrado', data: PEDIDO });

    expect((await peticion)?.id).toBe(12);
  });

  it('porOferta propaga los errores que no son 404', async () => {
    const peticion = facade.porOferta(78);
    peticion.catch(() => undefined);

    const req = http.expectOne(`${URL}/by-offer/78`);
    req.flush(
      { status: 403, msg: 'No autorizado', data: null },
      { status: 403, statusText: 'Forbidden' },
    );

    await expectAsync(peticion).toBeRejected();
  });

  it('pagar manda SOLO { method } — jamás datos de tarjeta', async () => {
    const peticion = facade.pagar(12, 'CARD');

    const req = http.expectOne(`${URL}/12/payment`);
    expect(req.request.method).toBe('POST');
    // Body exacto: un único campo. Ni number, ni expiry, ni cvv.
    expect(Object.keys(req.request.body)).toEqual(['method']);
    expect(req.request.body).toEqual({ method: 'CARD' });
    req.flush({
      status: 200,
      msg: 'Pago registrado',
      data: { ...PEDIDO, status: 'PREPARING', payment: { method: 'CARD', reference: 'PAY-1', paid_at: 'x' } },
    });

    expect((await peticion).payment?.reference).toBe('PAY-1');
  });

  it('pagar QR también solo lleva el método', async () => {
    const peticion = facade.pagar(12, 'QR');

    const req = http.expectOne(`${URL}/12/payment`);
    expect(req.request.body).toEqual({ method: 'QR' });
    req.flush({ status: 200, msg: 'Pago registrado', data: PEDIDO });

    await peticion;
  });

  it('cambiarEstado hace PATCH con { status }', async () => {
    const peticion = facade.cambiarEstado(12, 'IN_TRANSIT');

    const req = http.expectOne(`${URL}/12/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'IN_TRANSIT' });
    req.flush({ status: 200, msg: 'Estado actualizado', data: { ...PEDIDO, status: 'IN_TRANSIT' } });

    expect((await peticion).status).toBe('IN_TRANSIT');
  });

  it('confirmarRecepcion hace POST a confirm-receipt', async () => {
    const peticion = facade.confirmarRecepcion(12);

    const req = http.expectOne(`${URL}/12/confirm-receipt`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ status: 200, msg: 'Recepción confirmada', data: { ...PEDIDO, status: 'COMPLETED' } });

    expect((await peticion).status).toBe('COMPLETED');
  });

  it('MetodoPago solo admite QR o CARD (restricción de tipos)', () => {
    const metodos: MetodoPago[] = ['QR', 'CARD'];
    expect(metodos.length).toBe(2);
  });
});
