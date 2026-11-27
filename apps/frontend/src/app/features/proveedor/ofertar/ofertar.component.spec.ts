import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { OfertarComponent } from './ofertar.component';

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

describe('OfertarComponent', () => {
  let fixture: ComponentFixture<OfertarComponent>;
  let http: HttpTestingController;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function campo(nombre: string): HTMLInputElement {
    return (fixture.nativeElement as HTMLElement).querySelector(
      `[formControlName="${nombre}"]`,
    ) as HTMLInputElement;
  }

  async function ceder(veces = 20): Promise<void> {
    for (let i = 0; i < veces; i++) {
      await Promise.resolve();
    }
    fixture.detectChanges();
  }

  async function cargar(): Promise<void> {
    http.expectOne(`${URL}`).flush({ status: 200, msg: 'Operación exitosa', data: SOLICITUD });
    await ceder();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfertarComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '34' }) } } },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OfertarComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('muestra la solicitud sobre la que se ofertará', async () => {
    await cargar();

    expect(texto()).toContain('Pastillas de freno delanteras');
    expect(texto()).toContain('Toyota Corolla 2018');
    expect(texto()).toContain('Santa Cruz');
  });

  it('envía el body snake_case del contrato y navega a mis ofertas', async () => {
    await cargar();

    campo('price').value = '620';
    campo('price').dispatchEvent(new Event('input'));
    campo('brand').value = 'KYB';
    campo('brand').dispatchEvent(new Event('input'));

    const formulario = fixture.componentInstance.formulario;
    formulario.controls.estimated_days.setValue(2);
    formulario.controls.notes.setValue('Original');
    fixture.detectChanges();

    fixture.componentInstance.enviar();
    await ceder();

    const req = http.expectOne(`${URL}/offers`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      price: 620,
      brand: 'KYB',
      condition: 'NEW',
      availability: 'IN_STOCK',
      delivery_type: 'DELIVERY',
      estimated_days: 2,
      notes: 'Original',
    });
    req.flush({ status: 201, msg: 'Oferta enviada', data: { id: 78 } });
    await ceder();
  });

  it('no envía si el precio falta o es inválido', async () => {
    await cargar();

    fixture.componentInstance.formulario.controls.price.setValue('');
    fixture.detectChanges();

    await fixture.componentInstance.enviar();
    await ceder();

    http.expectNone((r) => r.method === 'POST');
    expect(fixture.componentInstance.formulario.invalid).toBeTrue();
  });

  it('muestra el msg del backend si ya tiene una oferta activa (409)', async () => {
    await cargar();

    campo('price').value = '620';
    campo('price').dispatchEvent(new Event('input'));
    campo('brand').value = 'KYB';
    campo('brand').dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.componentInstance.enviar();
    await ceder();

    http
      .expectOne(`${URL}/offers`)
      .flush(
        { status: 409, msg: 'Ya tienes una oferta activa en esta solicitud', data: null },
        { status: 409, statusText: 'Conflict' },
      );
    await ceder();

    expect(texto()).toContain('Ya tienes una oferta activa en esta solicitud');
  });

  it('muestra el msg si el detalle de la solicitud falla', async () => {
    http
      .expectOne(`${URL}`)
      .flush(
        { status: 403, msg: 'Tu perfil aún no está aprobado', data: null },
        { status: 403, statusText: 'Forbidden' },
      );
    await ceder();

    expect(texto()).toContain('Tu perfil aún no está aprobado');
  });
});
