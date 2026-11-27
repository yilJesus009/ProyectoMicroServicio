import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { PedidosProveedorComponent } from './pedidos-proveedor.component';

const URL = `${environment.apiUrl}/orders/supplier`;

function pedido(overrides: Record<string, unknown> = {}) {
  return {
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
    status: 'PREPARING',
    payment: { method: 'QR', reference: 'PAY-1', paid_at: 'x' },
    history: [],
    created_at: '2026-11-10T14:00:00Z',
    ...overrides,
  };
}

describe('PedidosProveedorComponent', () => {
  let fixture: ComponentFixture<PedidosProveedorComponent>;
  let http: HttpTestingController;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function boton(textoBoton: string): HTMLButtonElement | null {
    return (
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
        b.textContent?.includes(textoBoton),
      ) ?? null
    );
  }

  async function ceder(veces = 20): Promise<void> {
    for (let i = 0; i < veces; i++) {
      await Promise.resolve();
    }
    fixture.detectChanges();
  }

  async function cargar(pedidos: unknown[]): Promise<void> {
    http.expectOne(URL).flush({ status: 200, msg: 'Pedidos encontrados', data: pedidos });
    await ceder();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PedidosProveedorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PedidosProveedorComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('lista mis pedidos del proveedor', async () => {
    await cargar([pedido()]);

    expect(texto()).toContain('Amortiguador delantero derecho');
    expect(texto()).toContain('Preparando');
  });

  it('DELIVERY en PREPARING ofrece "Marcar en camino" → IN_TRANSIT', async () => {
    await cargar([pedido()]);

    expect(boton('Marcar en camino')).toBeTruthy();

    boton('Marcar en camino')?.click();
    await ceder();

    const req = http.expectOne((r) => r.url === `${URL.replace('/supplier', '/12/status')}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'IN_TRANSIT' });
    req.flush({ status: 200, msg: 'Estado actualizado', data: pedido({ status: 'IN_TRANSIT' }) });
    await ceder();

    expect(texto()).toContain('En camino');
    expect(boton('Marcar en camino')).toBeNull();
    expect(boton('Marcar entregado')).toBeTruthy();
  });

  it('PICKUP en PREPARING ofrece "Marcar listo para retiro" → READY_FOR_PICKUP', async () => {
    await cargar([pedido({ delivery_type: 'PICKUP' })]);

    expect(boton('Marcar listo para retiro')).toBeTruthy();
    expect(boton('Marcar en camino')).toBeNull();

    boton('Marcar listo para retiro')?.click();
    await ceder();

    const req = http.expectOne((r) => r.url.endsWith('/12/status'));
    expect(req.request.body).toEqual({ status: 'READY_FOR_PICKUP' });
    req.flush({ status: 200, msg: 'Estado actualizado', data: pedido({ status: 'READY_FOR_PICKUP' }) });
    await ceder();

    expect(texto()).toContain('Listo para retiro');
  });

  it('un pedido entregado (DELIVERED) ya no ofrece avanzar', async () => {
    await cargar([pedido({ status: 'DELIVERED' })]);

    expect(texto()).toContain('Entregado');
    expect(boton('Marcar entregado')).toBeNull();
  });

  it('un pedido pendiente de pago no ofrece ninguna acción', async () => {
    await cargar([pedido({ status: 'PENDING_PAYMENT' })]);

    expect(texto()).toContain('Pendiente de pago');
    expect(boton('Marcar')).toBeNull();
  });

  it('muestra el msg del backend (422) si la transición no corresponde', async () => {
    await cargar([pedido()]);

    boton('Marcar en camino')?.click();
    await ceder();

    http
      .expectOne((r) => r.url.endsWith('/12/status'))
      .flush(
        { status: 422, msg: 'Transición no permitida para este pedido', data: null },
        { status: 422, statusText: 'Unprocessable' },
      );
    await ceder();

    expect(texto()).toContain('Transición no permitida para este pedido');
  });

  it('sin pedidos avisa al proveedor', async () => {
    await cargar([]);

    expect(texto()).toContain('Todavía no tienes pedidos.');
  });

  it('muestra el msg del backend si la lista falla', async () => {
    http
      .expectOne(URL)
      .flush(
        { status: 403, msg: 'No tienes permiso para esta operación', data: null },
        { status: 403, statusText: 'Forbidden' },
      );
    await ceder();

    expect(texto()).toContain('No tienes permiso para esta operación');
  });
});
