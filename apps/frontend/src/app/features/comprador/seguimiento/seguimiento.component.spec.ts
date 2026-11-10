import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { SeguimientoComponent } from './seguimiento.component';

const URL = `${environment.apiUrl}/orders/12`;

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
    status: 'PENDING_PAYMENT',
    payment: null,
    history: [{ from_status: null, to_status: 'PENDING_PAYMENT', changed_at: '2026-11-10T14:00:00Z' }],
    created_at: '2026-11-10T14:00:00Z',
    ...overrides,
  };
}

describe('SeguimientoComponent', () => {
  let fixture: ComponentFixture<SeguimientoComponent>;
  let http: HttpTestingController;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function boton(textoBoton: string): HTMLElement | null {
    return (
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('button, a'),
      ).find((b) => b.textContent?.includes(textoBoton)) ?? null
    );
  }

  async function ceder(veces = 20): Promise<void> {
    for (let i = 0; i < veces; i++) {
      await Promise.resolve();
    }
    fixture.detectChanges();
  }

  async function cargar(datos: unknown = pedido()): Promise<void> {
    http.expectOne(URL).flush({ status: 200, msg: 'Pedido encontrado', data: datos });
    await ceder();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeguimientoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '12' }) } } },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SeguimientoComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('muestra el resumen, el estado en español y la línea de tiempo', async () => {
    await cargar();

    expect(texto()).toContain('Amortiguador delantero derecho');
    expect(texto()).toContain('AutoParts Center');
    expect(texto()).toContain('Pendiente de pago');
    expect(texto()).toContain('Línea de tiempo');
    // PENDIENTE_DE_PAGO → ofrece pagar.
    expect(boton('Pagar ahora')).toBeTruthy();
  });

  it('con pedido pagado muestra la referencia del pago', async () => {
    await cargar(
      pedido({
        status: 'PREPARING',
        payment: { method: 'QR', reference: 'PAY-20261110-000012', paid_at: '2026-11-10T15:00:00Z' },
      }),
    );

    expect(texto()).toContain('PAY-20261110-000012');
    expect(texto()).toContain('QR');
    expect(texto()).toContain('Preparando');
    expect(boton('Pagar ahora')).toBeNull();
  });

  it('DELIVERED ofrece "Confirmar recepción" y al confirmar pasa a COMPLETED', async () => {
    await cargar(pedido({ status: 'DELIVERED' }));

    const confirmar = boton('Confirmar recepción');
    expect(confirmar).toBeTruthy();

    confirmar?.click();
    await ceder();

    const req = http.expectOne(`${URL}/confirm-receipt`);
    expect(req.request.method).toBe('POST');
    req.flush({
      status: 200,
      msg: 'Recepción confirmada',
      data: pedido({ status: 'COMPLETED' }),
    });
    await ceder();

    expect(texto()).toContain('Recepción confirmada. El pedido y la solicitud quedaron completados.');
    expect(texto()).toContain('Pedido completado. ¡Gracias!');
    expect(boton('Confirmar recepción')).toBeNull();
  });

  it('muestra el msg del backend (422) si confirmar no está permitido', async () => {
    await cargar(pedido({ status: 'DELIVERED' }));

    boton('Confirmar recepción')?.click();
    await ceder();

    http
      .expectOne(`${URL}/confirm-receipt`)
      .flush(
        { status: 422, msg: 'El pedido no está entregado', data: null },
        { status: 422, statusText: 'Unprocessable' },
      );
    await ceder();

    expect(texto()).toContain('El pedido no está entregado');
  });

  it('PREPARING espera al proveedor y no ofrece acciones del comprador', async () => {
    await cargar(pedido({ status: 'PREPARING' }));

    expect(texto()).toContain('Esperando al proveedor');
    expect(boton('Confirmar recepción')).toBeNull();
    expect(boton('Pagar ahora')).toBeNull();
  });

  it('muestra el msg del backend si el detalle falla', async () => {
    http
      .expectOne(URL)
      .flush(
        { status: 403, msg: 'No autorizado para este pedido', data: null },
        { status: 403, statusText: 'Forbidden' },
      );
    await ceder();

    expect(texto()).toContain('No autorizado para este pedido');
  });
});
