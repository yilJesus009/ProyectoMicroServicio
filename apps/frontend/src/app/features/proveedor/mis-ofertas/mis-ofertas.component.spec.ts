import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { MisOfertasComponent } from './mis-ofertas.component';

const URL = `${environment.apiUrl}/offers/mine`;

function oferta(overrides: Record<string, unknown> = {}) {
  return {
    id: 78,
    part_request_id: 34,
    supplier_id: 55,
    supplier_name: 'AutoParts Center',
    price: 620,
    currency: 'BOB',
    brand: 'KYB',
    condition: 'NEW',
    availability: 'IN_STOCK',
    delivery_type: 'DELIVERY',
    estimated_days: 2,
    notes: null,
    status: 'SUBMITTED',
    created_at: '2026-11-10T14:00:00Z',
    ...overrides,
  };
}

describe('MisOfertasComponent', () => {
  let fixture: ComponentFixture<MisOfertasComponent>;
  let http: HttpTestingController;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function botonRetirar(): HTMLButtonElement | null {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Retirar oferta'),
    ) ?? null;
  }

  async function ceder(veces = 20): Promise<void> {
    for (let i = 0; i < veces; i++) {
      await Promise.resolve();
    }
    fixture.detectChanges();
  }

  async function cargar(ofertas: unknown[]): Promise<void> {
    http.expectOne(URL).flush({ status: 200, msg: 'Ofertas encontradas', data: ofertas });
    await ceder();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisOfertasComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MisOfertasComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('lista mis ofertas con su estado en español', async () => {
    await cargar([oferta()]);

    expect(texto()).toContain('AutoParts Center');
    expect(texto()).toContain('Enviada');
    expect(botonRetirar()).toBeTruthy();
  });

  it('retirar hace PATCH a withdraw y actualiza la tarjeta', async () => {
    await cargar([oferta()]);

    botonRetirar()?.click();
    await ceder();

    const req = http.expectOne(
      (r) => r.method === 'PATCH' && r.url.endsWith('/78/withdraw'),
    );
    req.flush({ status: 200, msg: 'Oferta retirada', data: oferta({ status: 'WITHDRAWN' }) });
    await ceder();

    expect(texto()).toContain('Oferta retirada.');
    expect(texto()).toContain('Retirada');
    expect(botonRetirar()).toBeNull();
  });

  it('no ofrece retirar en ofertas que no están SUBMITTED', async () => {
    await cargar([oferta({ status: 'ACCEPTED' })]);

    expect(texto()).toContain('Aceptada');
    expect(botonRetirar()).toBeNull();
  });

  it('sin ofertas avisa al proveedor', async () => {
    await cargar([]);

    expect(texto()).toContain('Todavía no enviaste ofertas.');
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

  it('muestra el msg del backend (422) si retirar no está permitido', async () => {
    await cargar([oferta()]);

    botonRetirar()?.click();
    await ceder();

    http
      .expectOne((r) => r.url.endsWith('/78/withdraw'))
      .flush(
        { status: 422, msg: 'La solicitud ya no acepta retiradas', data: null },
        { status: 422, statusText: 'Unprocessable' },
      );
    await ceder();

    expect(texto()).toContain('La solicitud ya no acepta retiradas');
  });
});
