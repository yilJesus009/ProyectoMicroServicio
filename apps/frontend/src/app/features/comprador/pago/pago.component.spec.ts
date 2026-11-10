import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { PagoComponent } from './pago.component';

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

describe('PagoComponent', () => {
  let fixture: ComponentFixture<PagoComponent>;
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
      imports: [PagoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '12' }) } } },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PagoComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    // El componente agenda una navegación tras el pago: cancelarla al terminar.
    fixture.destroy();
  });

  it('muestra el resumen y el aviso de simulación con la pestaña QR por defecto', async () => {
    await cargar();

    expect(texto()).toContain('Amortiguador delantero derecho');
    expect(texto()).toContain('620.00');
    expect(texto()).toContain('Simulación: no se realiza ningún cobro');
    expect(texto()).toContain('REPUESTOSYA|PEDIDO-12|620.00|BOB');
    expect(boton('Ya pagué')).toBeTruthy();
  });

  it('pinta el código QR con módulos (sin innerHTML)', async () => {
    await cargar();

    const codigo = (fixture.nativeElement as HTMLElement).querySelector('.codigo');
    expect(codigo).toBeTruthy();
    // Un QR tiene cientos de módulos y algunos oscuros.
    const modulos = codigo?.querySelectorAll('span') ?? [];
    expect(modulos.length).toBeGreaterThan(400);
    expect(codigo?.querySelectorAll('span.oscuro').length ?? 0).toBeGreaterThan(50);
  });

  it('el pago QR envía SOLO { method: "QR" } y muestra la referencia', async () => {
    const navegar = spyOn(TestBed.inject(Router), 'navigate');
    await cargar();

    boton('Ya pagué')?.click();
    await ceder();

    const req = http.expectOne(`${URL}/payment`);
    expect(req.request.method).toBe('POST');
    // Body exacto: un único campo. Ni number, ni expiry, ni cvv.
    expect(Object.keys(req.request.body)).toEqual(['method']);
    expect(req.request.body).toEqual({ method: 'QR' });

    req.flush({
      status: 200,
      msg: 'Pago registrado',
      data: pedido({
        status: 'PREPARING',
        payment: { method: 'QR', reference: 'PAY-20261110-000012', paid_at: '2026-11-10T15:00:00Z' },
      }),
    });
    await ceder();

    expect(texto()).toContain('Pago simulado registrado. Referencia: PAY-20261110-000012');

    // Tras el aviso, la app lleva al seguimiento (temporizador de 1,5 s).
    await new Promise((resolver) => setTimeout(resolver, 1600));
    expect(navegar).toHaveBeenCalledWith(['/comprador/pedidos', 12]);
  });

  it('la pestaña tarjeta precarga los datos de demo y valida solo el formato', async () => {
    await cargar();

    boton('Tarjeta')?.click();
    await ceder();

    const numero = (fixture.nativeElement as HTMLElement).querySelector(
      '[formControlName="numero"]',
    ) as HTMLInputElement;
    const vencimiento = (fixture.nativeElement as HTMLElement).querySelector(
      '[formControlName="vencimiento"]',
    ) as HTMLInputElement;
    const cvv = (fixture.nativeElement as HTMLElement).querySelector(
      '[formControlName="cvv"]',
    ) as HTMLInputElement;

    expect(numero.value).toBe('4111 1111 1111 1111');
    expect(vencimiento.value).toBe('12/30');
    expect(cvv.value).toBe('123');

    // Formato inválido → ni siquiera se intenta el pago.
    fixture.componentInstance.formulario.controls.numero.setValue('1234');
    fixture.detectChanges();
    boton('Confirmar pago')?.click();
    await ceder();
    http.expectNone((r) => r.method === 'POST');
    expect(fixture.componentInstance.formulario.invalid).toBeTrue();
  });

  it('el pago con tarjeta envía SOLO { method: "CARD" } — nunca los datos', async () => {
    await cargar();

    boton('Tarjeta')?.click();
    await ceder();
    boton('Confirmar pago')?.click();
    await ceder();

    const req = http.expectOne(`${URL}/payment`);
    expect(Object.keys(req.request.body)).toEqual(['method']);
    expect(req.request.body).toEqual({ method: 'CARD' });
    // Los datos de la tarjeta NO viajan.
    expect(JSON.stringify(req.request.body)).not.toContain('4111');

    req.flush({
      status: 200,
      msg: 'Pago registrado',
      data: pedido({
        status: 'PREPARING',
        payment: { method: 'CARD', reference: 'PAY-CARD-1', paid_at: '2026-11-10T15:00:00Z' },
      }),
    });
    await ceder();

    expect(texto()).toContain('PAY-CARD-1');
  });

  it('muestra el msg del backend (422) si el pedido ya no está pendiente de pago', async () => {
    await cargar();

    boton('Ya pagué')?.click();
    await ceder();

    http
      .expectOne(`${URL}/payment`)
      .flush(
        { status: 422, msg: 'El pedido no está pendiente de pago', data: null },
        { status: 422, statusText: 'Unprocessable' },
      );
    await ceder();

    expect(texto()).toContain('El pedido no está pendiente de pago');
  });

  it('un pedido que ya pagó muestra el estado y el enlace al seguimiento', async () => {
    await cargar(
      pedido({
        status: 'PREPARING',
        payment: { method: 'QR', reference: 'PAY-1', paid_at: '2026-11-10T15:00:00Z' },
      }),
    );

    expect(texto()).toContain('ya no está pendiente de pago');
    expect(texto()).toContain('Preparando');
    expect(boton('Ya pagué')).toBeNull();
    expect(boton('Ver seguimiento')).toBeTruthy();
  });

  it('muestra el msg del backend si el detalle falla', async () => {
    http
      .expectOne(URL)
      .flush(
        { status: 404, msg: 'Pedido no encontrado', data: null },
        { status: 404, statusText: 'Not Found' },
      );
    await ceder();

    expect(texto()).toContain('Pedido no encontrado');
  });
});
