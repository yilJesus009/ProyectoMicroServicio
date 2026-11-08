import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { PerfilProveedorComponent } from './perfil.component';

const ME_URL = `${environment.apiUrl}/suppliers/me`;
const CATEGORIAS_URL = `${environment.apiUrl}/categories`;

const PERFIL = {
  id: 55,
  user_id: 7,
  business_name: 'AutoParts Center',
  city: 'Santa Cruz',
  phone: '70000000',
  category_ids: [1, 3],
  status: 'APPROVED' as const,
  rejection_reason: null,
  reviewed_by: 1,
  reviewed_at: '2026-11-08T13:00:00Z',
  created_at: '2026-11-08T12:00:00Z',
  updated_at: '2026-11-08T13:00:00Z',
};

const CATEGORIAS = [
  { id: 1, name: 'Frenos', description: null, icon: 'brake', active: true },
  { id: 3, name: 'Suspensión', description: null, icon: 'shock', active: true },
];

describe('PerfilProveedorComponent', () => {
  let fixture: ComponentFixture<PerfilProveedorComponent>;
  let http: HttpTestingController;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function enviar(): void {
    const form = (fixture.nativeElement as HTMLElement).querySelector('form');
    form?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  /**
   * Cede el turno a las microtareas encadenadas del componente: cargar()
   * (y guardar()) encadenan varias promesas de las facades, y una sola
   * espera no siempre las drena todas. 20 turnos bastan de sobra para
   * cualquier cadena de este componente y el resultado es determinista.
   */
  async function ceder(veces = 20): Promise<void> {
    for (let i = 0; i < veces; i++) {
      await Promise.resolve();
    }
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilProveedorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PerfilProveedorComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('sin perfil (404 del contrato) muestra el aviso de crearlo', async () => {
    http
      .expectOne(ME_URL)
      .flush(
        { status: 404, msg: 'El proveedor no tiene un perfil comercial', data: null },
        { status: 404, statusText: 'Not Found' },
      );
    http
      .expectOne(CATEGORIAS_URL)
      .flush({ status: 200, msg: 'Operación exitosa', data: CATEGORIAS });

    await ceder();

    expect(texto()).toContain('Aún no completas tu perfil');
    expect(fixture.componentInstance.form.value.business_name).toBe('');
  });

  it('carga un perfil existente en el formulario y muestra su estado', async () => {
    http.expectOne(ME_URL).flush({ status: 200, msg: 'Perfil comercial', data: PERFIL });
    http
      .expectOne(CATEGORIAS_URL)
      .flush({ status: 200, msg: 'Operación exitosa', data: CATEGORIAS });

    await ceder();

    expect(fixture.componentInstance.form.value).toEqual({
      business_name: 'AutoParts Center',
      city: 'Santa Cruz',
      phone: '70000000',
      category_ids: [1, 3],
    });
    expect(texto()).toContain('Aprobado');
  });

  it('guardar manda PUT con los cuatro campos del contrato', async () => {
    http
      .expectOne(ME_URL)
      .flush(
        { status: 404, msg: 'sin perfil', data: null },
        { status: 404, statusText: 'Not Found' },
      );
    http
      .expectOne(CATEGORIAS_URL)
      .flush({ status: 200, msg: 'Operación exitosa', data: CATEGORIAS });
    await ceder();

    fixture.componentInstance.form.setValue({
      business_name: 'Taller Nuevo',
      city: 'Cochabamba',
      phone: '60000000',
      category_ids: [1],
    });
    fixture.detectChanges();
    enviar();

    const req = http.expectOne(ME_URL);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      business_name: 'Taller Nuevo',
      city: 'Cochabamba',
      phone: '60000000',
      category_ids: [1],
    });
    req.flush({
      status: 200,
      msg: 'Perfil comercial guardado; pendiente de aprobación',
      data: { ...PERFIL, status: 'PENDING', business_name: 'Taller Nuevo' },
    });

    await ceder();

    expect(texto()).toContain('pendiente de aprobación del administrador');
    expect(texto()).toContain('Pendiente de aprobación');
  });

  it('muestra el msg del backend cuando el guardado falla', async () => {
    http
      .expectOne(ME_URL)
      .flush(
        { status: 404, msg: 'sin perfil', data: null },
        { status: 404, statusText: 'Not Found' },
      );
    http
      .expectOne(CATEGORIAS_URL)
      .flush({ status: 200, msg: 'Operación exitosa', data: CATEGORIAS });
    await ceder();

    fixture.componentInstance.form.setValue({
      business_name: 'Taller Nuevo',
      city: 'Cochabamba',
      phone: '60000000',
      category_ids: [1],
    });
    enviar();

    http
      .expectOne(ME_URL)
      .flush(
        { status: 400, msg: 'Datos inválidos', data: null },
        { status: 400, statusText: 'Bad Request' },
      );

    await ceder();

    expect(texto()).toContain('Datos inválidos');
  });

  it('con el formulario vacío no manda ninguna petición', async () => {
    http
      .expectOne(ME_URL)
      .flush(
        { status: 404, msg: 'sin perfil', data: null },
        { status: 404, statusText: 'Not Found' },
      );
    http
      .expectOne(CATEGORIAS_URL)
      .flush({ status: 200, msg: 'Operación exitosa', data: CATEGORIAS });
    await ceder();

    enviar();

    expect(fixture.componentInstance.form.invalid).toBeTrue();
    http.expectNone(ME_URL);
  });
});
