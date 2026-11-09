import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { MisSolicitudesComponent } from './mis-solicitudes.component';

const URL = `${environment.apiUrl}/part-requests/mine`;

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

describe('MisSolicitudesComponent', () => {
  let fixture: ComponentFixture<MisSolicitudesComponent>;
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
      imports: [MisSolicitudesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MisSolicitudesComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('lista mis solicitudes con su estado en español', async () => {
    http.expectOne(URL).flush({ status: 200, msg: 'Operación exitosa', data: [SOLICITUD] });
    await ceder();

    expect(texto()).toContain('Pastillas de freno delanteras');
    expect(texto()).toContain('Publicada');
    expect(texto()).toContain('Toyota Corolla 2018');
    expect(texto()).toContain('Urgencia alta');
  });

  it('sin solicitudes muestra el aviso para crear la primera', async () => {
    http.expectOne(URL).flush({ status: 200, msg: 'Operación exitosa', data: [] });
    await ceder();

    expect(texto()).toContain('Aún no publicaste solicitudes');
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
