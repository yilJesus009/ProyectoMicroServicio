import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { SolicitudesAbiertasComponent } from './solicitudes-abiertas.component';

const ME_URL = `${environment.apiUrl}/suppliers/me`;
const CATEGORIAS_URL = `${environment.apiUrl}/categories`;
const ABIERTAS_URL = `${environment.apiUrl}/part-requests/open`;

const PERFIL_APROBADO = {
  id: 55,
  user_id: 7,
  business_name: 'AutoParts Center',
  city: 'Santa Cruz',
  phone: '70000000',
  category_ids: [1],
  status: 'APPROVED' as const,
  rejection_reason: null,
  reviewed_by: 1,
  reviewed_at: '2026-11-08T13:00:00Z',
  created_at: '2026-11-08T12:00:00Z',
  updated_at: '2026-11-08T13:00:00Z',
};

const SOLICITUD = {
  id: 34,
  user_id: 7,
  category_id: 1,
  category_name: 'Frenos',
  vehicle_label: 'Toyota Corolla 2018',
  description: 'Pastillas de freno delanteras',
  city: 'Santa Cruz',
  urgency: 'ALTA' as const,
  status: 'PUBLISHED' as const,
  photo: null,
  created_at: '2026-11-08T12:00:00Z',
};

describe('SolicitudesAbiertasComponent', () => {
  let fixture: ComponentFixture<SolicitudesAbiertasComponent>;
  let http: HttpTestingController;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  /** Cede el turno a las microtareas encadenadas y repinta. */
  async function ceder(veces = 20): Promise<void> {
    for (let i = 0; i < veces; i++) {
      await Promise.resolve();
    }
    fixture.detectChanges();
  }

  /**
   * Espera a que el componente pidan una URL: cargar() es por etapas
   * (perfil → categorías → solicitudes), así que la petición siguiente
   * todavía no existe cuando se resuelve la anterior.
   */
  async function esperarPeticion(url: string): Promise<TestRequest> {
    for (let i = 0; i < 50; i++) {
      const [peticion] = http.match(url);
      if (peticion) return peticion;
      await Promise.resolve();
    }
    throw new Error(`No llegó la petición a ${url}`);
  }

  /** Responde en orden las peticiones iniciales de cargar(). */
  async function responderInicio(perfil: unknown, solicitudes: unknown[] = []): Promise<void> {
    http.expectOne(ME_URL).flush({ status: 200, msg: 'Perfil comercial', data: perfil });
    if ((perfil as { status?: string } | null)?.status === 'APPROVED') {
      (await esperarPeticion(CATEGORIAS_URL)).flush({
        status: 200,
        msg: 'Operación exitosa',
        data: [],
      });
      (await esperarPeticion(ABIERTAS_URL)).flush({
        status: 200,
        msg: 'Operación exitosa',
        data: solicitudes,
      });
    }
    await ceder();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitudesAbiertasComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SolicitudesAbiertasComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('sin perfil aprobado muestra el aviso y NO pide solicitudes', async () => {
    await responderInicio({ ...PERFIL_APROBADO, status: 'PENDING' });

    expect(texto()).toContain('Tu perfil todavía no está aprobado');
    http.expectNone(ABIERTAS_URL);
    http.expectNone(CATEGORIAS_URL);
  });

  it('con el perfil aprobado lista las solicitudes abiertas', async () => {
    await responderInicio(PERFIL_APROBADO, [SOLICITUD]);

    expect(texto()).toContain('Pastillas de freno delanteras');
    expect(texto()).toContain('Publicada');
    expect(texto()).toContain('Toyota Corolla 2018');
  });

  it('al filtrar por ciudad vuelve a pedir con el query param', async () => {
    await responderInicio(PERFIL_APROBADO, [SOLICITUD]);

    const ciudad = (fixture.nativeElement as HTMLElement).querySelector('input');
    if (ciudad) {
      ciudad.value = 'Cochabamba';
      ciudad.dispatchEvent(new Event('input'));
    }
    const form = (fixture.nativeElement as HTMLElement).querySelector('form');
    form?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const req = http.expectOne(
      (request) =>
        request.url === ABIERTAS_URL && request.params.get('city') === 'Cochabamba',
    );
    req.flush({ status: 200, msg: 'Operación exitosa', data: [] });

    await ceder();

    expect(texto()).toContain('No hay solicitudes abiertas');
  });
});
