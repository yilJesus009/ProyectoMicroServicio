import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { DetalleSolicitudComponent } from './detalle-solicitud.component';

const URL = `${environment.apiUrl}/part-requests/34`;

const SOLICITUD = {
  id: 34,
  user_id: 7,
  category_id: 1,
  category_name: 'Frenos',
  vehicle_label: 'Toyota Corolla 2018',
  description: 'Pastillas de freno delanteras',
  city: 'Santa Cruz',
  urgency: 'ALTA',
  status: 'PUBLISHED',
  photo: null,
  created_at: '2026-11-08T12:00:00Z',
};

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

describe('DetalleSolicitudComponent (comparador)', () => {
  let fixture: ComponentFixture<DetalleSolicitudComponent>;
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

  /** Deja cargar detalle + ofertas (dos peticiones en paralelo). */
  async function cargar(ofertas: unknown[] = [oferta()]): Promise<void> {
    const peticiones = http.match(() => true);
    for (const req of peticiones) {
      if (req.request.url.endsWith('/offers')) {
        req.flush({ status: 200, msg: 'Ofertas encontradas', data: ofertas });
      } else {
        req.flush({ status: 200, msg: 'Operación exitosa', data: SOLICITUD });
      }
    }
    await ceder();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleSolicitudComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '34' }) } } },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DetalleSolicitudComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    // Destruye PRIMERO: cancela el temporizador del polling by-offer y
    // revoca el object URL de la foto antes de verificar las peticiones.
    fixture.destroy();
    http.verify();
  });

  it('pide el detalle y las ofertas ordenadas por precio por defecto', async () => {
    const peticiones = http.match(() => true);
    expect(peticiones.length).toBe(2);

    const ofertasReq = peticiones.find((r) => r.request.url.endsWith('/offers'));
    expect(ofertasReq?.request.params.get('sort')).toBe('price');

    for (const req of peticiones) {
      if (req.request.url.endsWith('/offers')) {
        req.flush({ status: 200, msg: 'Ofertas encontradas', data: [oferta()] });
      } else {
        req.flush({ status: 200, msg: 'Operación exitosa', data: SOLICITUD });
      }
    }
    await ceder();

    expect(texto()).toContain('Pastillas de freno delanteras');
    expect(texto()).toContain('Ofertas recibidas (1)');
    expect(texto()).toContain('AutoParts Center');
    expect(texto()).toContain('Aceptar oferta');
  });

  it('cambia el orden a días y vuelve a pedir con ?sort=days', async () => {
    await cargar();

    fixture.componentInstance.cambiarOrden('days');
    await ceder();

    const req = http.expectOne(
      (r) => r.url === `${URL}/offers` && r.params.get('sort') === 'days',
    );
    req.flush({ status: 200, msg: 'Ofertas encontradas', data: [oferta({ estimated_days: 5 })] });
    await ceder();

    expect(texto()).toContain('5 día(s)');
  });

  it('abre el panel de confirmación antes de aceptar', async () => {
    await cargar();

    boton('Aceptar oferta')?.click();
    await ceder();

    expect(texto()).toContain('¿Aceptar esta oferta?');
    expect(texto()).toContain('Esta acción no se puede deshacer.');
    // Todavía no se llamó al backend.
    http.expectNone((r) => r.method === 'POST');
  });

  it('muestra el msg del backend (409) al confirmar si ya hay oferta aceptada', async () => {
    await cargar();

    boton('Aceptar oferta')?.click();
    await ceder();
    boton('Sí, aceptar')?.click();
    await ceder();

    const peticiones = http.match((r) => r.method === 'POST' && r.url.endsWith('/accept'));
    expect(peticiones.length).toBe(1);
    peticiones[0].flush(
      { status: 409, msg: 'Ya hay una oferta aceptada en esta solicitud', data: null },
      { status: 409, statusText: 'Conflict' },
    );
    await ceder();

    expect(texto()).toContain('Ya hay una oferta aceptada en esta solicitud');
  });

  it('aceptar con éxito marca la oferta y rechaza las demás en pantalla', async () => {
    await cargar([oferta(), oferta({ id: 79, supplier_name: 'Repuestos SA', price: 700 })]);

    boton('Aceptar oferta')?.click();
    await ceder();
    boton('Sí, aceptar')?.click();
    await ceder();

    const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/accept'));
    req.flush({
      status: 200,
      msg: 'Oferta aceptada',
      data: {
        offer: { ...oferta(), status: 'ACCEPTED' },
        part_request: { ...SOLICITUD, status: 'OFFER_ACCEPTED' },
      },
    });
    await ceder();

    expect(texto()).toContain('Oferta aceptada. El pedido se generará en unos segundos.');
    expect(texto()).toContain('Aceptada');
    expect(texto()).toContain('No elegida');
    expect(texto()).not.toContain('Aceptar oferta');
  });

  it('cancelar la confirmación no llama al backend', async () => {
    await cargar();

    boton('Aceptar oferta')?.click();
    await ceder();
    boton('Cancelar')?.click();
    await ceder();

    expect(texto()).not.toContain('¿Aceptar esta oferta?');
    http.expectNone((r) => r.method === 'POST');
  });

  it('una oferta retirada (WITHDRAWN) no ofrece aceptar junto a una SUBMITTED', async () => {
    await cargar([
      oferta(),
      oferta({ id: 79, supplier_name: 'Repuestos SA', price: 700, status: 'WITHDRAWN' }),
    ]);

    const tarjetas = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('app-offer-card'),
    );
    expect(tarjetas.length).toBe(2);

    // Solo la SUBMITTED muestra el botón; la retirada, no (el backend daría 422).
    const botones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const botonesAceptar = botones.filter((b) => b.textContent?.includes('Aceptar oferta'));
    expect(botonesAceptar.length).toBe(1);
    expect(texto()).toContain('Retirada');
    expect(texto()).toContain('Enviada');
  });

  it('sin ofertas avisa al comprador', async () => {
    await cargar([]);

    expect(texto()).toContain('Todavía no hay ofertas para esta solicitud.');
  });

  it('si la solicitud ya tiene oferta aceptada no ofrece aceptar de nuevo', async () => {
    const peticiones = http.match(() => true);
    for (const req of peticiones) {
      if (req.request.url.endsWith('/offers')) {
        req.flush({
          status: 200,
          msg: 'Ofertas encontradas',
          data: [oferta({ status: 'ACCEPTED' })],
        });
      } else {
        req.flush({
          status: 200,
          msg: 'Operación exitosa',
          data: { ...SOLICITUD, status: 'OFFER_ACCEPTED' },
        });
      }
    }
    await ceder();

    expect(texto()).not.toContain('Aceptar oferta');
    expect(texto()).toContain('ya tiene una oferta aceptada');
  });

  it('muestra el msg del backend si el detalle falla', async () => {
    const peticiones = http.match(() => true);
    for (const req of peticiones) {
      req.flush(
        { status: 403, msg: 'No autorizado', data: null },
        { status: 403, statusText: 'Forbidden' },
      );
    }
    await ceder();

    expect(texto()).toContain('No autorizado');
  });

  // ---------------------------------------------------------------------
  // Foto del detalle (blob con token — ítem de la tabla de revisión)
  // ---------------------------------------------------------------------

  it('si la solicitud tiene foto la pide como blob y la pinta con object URL', async () => {
    const crearUrl = spyOn(window.URL, 'createObjectURL').and.returnValue('blob:foto-34');

    const peticiones = http.match(() => true);
    for (const req of peticiones) {
      if (req.request.url.endsWith('/offers')) {
        req.flush({ status: 200, msg: 'Ofertas encontradas', data: [oferta()] });
      } else {
        req.flush({
          status: 200,
          msg: 'Operación exitosa',
          data: { ...SOLICITUD, photo: '/uploads/requests/34.jpg' },
        });
      }
    }
    await ceder();

    // Se pide como blob: la cabecera Authorization la agrega el interceptor.
    const fotoReq = http.expectOne((r) => r.url.endsWith('/photo'));
    expect(fotoReq.request.method).toBe('GET');
    expect(fotoReq.request.responseType).toBe('blob');
    fotoReq.flush(new Blob(['jpeg'], { type: 'image/jpeg' }));
    await ceder();

    expect(crearUrl).toHaveBeenCalled();
    const img = (fixture.nativeElement as HTMLElement).querySelector('img');
    expect(img?.getAttribute('src')).toBe('blob:foto-34');
    expect(img?.getAttribute('alt')).toContain('Pastillas de freno delanteras');
  });

  it('revoca el object URL de la foto al destruir la pantalla', async () => {
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:foto-34');
    const revocar = spyOn(window.URL, 'revokeObjectURL');

    const peticiones = http.match(() => true);
    for (const req of peticiones) {
      if (req.request.url.endsWith('/offers')) {
        req.flush({ status: 200, msg: 'Ofertas encontradas', data: [oferta()] });
      } else {
        req.flush({
          status: 200,
          msg: 'Operación exitosa',
          data: { ...SOLICITUD, photo: '/uploads/requests/34.jpg' },
        });
      }
    }
    await ceder();
    http.expectOne((r) => r.url.endsWith('/photo')).flush(new Blob(['jpeg']));
    await ceder();

    fixture.destroy();

    expect(revocar).toHaveBeenCalledWith('blob:foto-34');
  });

  // ---------------------------------------------------------------------
  // "Generando tu pedido…" — polling by-offer cada 2 s (ítem de la tabla)
  // ---------------------------------------------------------------------

  /** Acepta la primera oferta y deja el accept respondido. */
  async function aceptarOferta(): Promise<void> {
    boton('Aceptar oferta')?.click();
    await ceder();
    boton('Sí, aceptar')?.click();
    await ceder();

    http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/accept')).flush({
      status: 200,
      msg: 'Oferta aceptada',
      data: {
        offer: { ...oferta(), status: 'ACCEPTED' },
        part_request: { ...SOLICITUD, status: 'OFFER_ACCEPTED' },
      },
    });
    await ceder();
  }

  const PEDIDO = {
    id: 12,
    offer_id: 78,
    part_request_id: 34,
    buyer_id: 7,
    supplier_id: 55,
    supplier_name: 'AutoParts Center',
    part_description: 'Pastillas de freno delanteras',
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

  it('tras aceptar muestra "Generando tu pedido…" y navega al pago cuando aparece', async () => {
    jasmine.clock().install();
    try {
      const navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      await cargar();

      await aceptarOferta();

      expect(texto()).toContain('Generando tu pedido…');

      // 1er intento a los 2 s: el pedido aún no existe (404 = sigue).
      jasmine.clock().tick(2000);
      await ceder();
      http
        .expectOne((r) => r.url.endsWith('/by-offer/78'))
        .flush(
          { status: 404, msg: 'Pedido no encontrado', data: null },
          { status: 404, statusText: 'Not Found' },
        );
      await ceder();

      // 2º intento: ya existe → la pantalla lleva a su pago.
      jasmine.clock().tick(2000);
      await ceder();
      http
        .expectOne((r) => r.url.endsWith('/by-offer/78'))
        .flush({ status: 200, msg: 'Pedido encontrado', data: PEDIDO });
      await ceder();

      expect(navegar).toHaveBeenCalledWith(['/comprador/pedidos', 12, 'pago']);
      expect(texto()).not.toContain('Generando tu pedido…');
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('si el pedido no aparece tras los intentos avisa y se rinde', async () => {
    jasmine.clock().install();
    try {
      await cargar();
      await aceptarOferta();

      // 15 intentos × 2 s con 404 en cada uno.
      for (let intento = 0; intento < 15; intento++) {
        jasmine.clock().tick(2000);
        await ceder();
        http
          .expectOne((r) => r.url.endsWith('/by-offer/78'))
          .flush(
            { status: 404, msg: 'Pedido no encontrado', data: null },
            { status: 404, statusText: 'Not Found' },
          );
        await ceder();
      }

      expect(texto()).toContain('El pedido está tardando más de lo esperado');
      expect(texto()).not.toContain('Generando tu pedido…');

      // No vuelve a programar intentos.
      jasmine.clock().tick(2000);
      await ceder();
      http.expectNone((r) => r.url.endsWith('/by-offer/78'));
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
