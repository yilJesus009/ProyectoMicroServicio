import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { MisPedidosComponent } from './mis-pedidos.component';

const URL = `${environment.apiUrl}/orders/mine`;

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
  history: [],
  created_at: '2026-11-10T14:00:00Z',
};

describe('MisPedidosComponent', () => {
  let fixture: ComponentFixture<MisPedidosComponent>;
  let http: HttpTestingController;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  async function ceder(veces = 20): Promise<void> {
    for (let i = 0; i < veces; i++) {
      await Promise.resolve();
    }
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisPedidosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MisPedidosComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('pide GET /orders/mine y lista los pedidos con enlace al seguimiento', async () => {
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 200, msg: 'Pedidos encontrados', data: [PEDIDO] });
    await ceder();

    expect(texto()).toContain('Amortiguador delantero derecho');
    expect(texto()).toContain('Pendiente de pago');

    const enlace = (fixture.nativeElement as HTMLElement).querySelector('ul a[href]');
    expect(enlace?.getAttribute('href')).toBe('/comprador/pedidos/12');
  });

  it('sin pedidos muestra el mensaje vacío', async () => {
    http.expectOne(URL).flush({ status: 200, msg: 'Pedidos encontrados', data: [] });
    await ceder();

    expect(texto()).toContain('Todavía no tienes pedidos.');
  });

  it('muestra el msg del backend si la lista falla', async () => {
    http
      .expectOne(URL)
      .flush(
        { status: 500, msg: 'Error interno', data: null },
        { status: 500, statusText: 'Server Error' },
      );
    await ceder();

    expect(texto()).toContain('Error interno');
  });
});
