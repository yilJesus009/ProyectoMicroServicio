import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { SolicitudesFacade } from './solicitudes.facade';

const URL = `${environment.apiUrl}/part-requests`;

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

describe('SolicitudesFacade', () => {
  let http: HttpTestingController;
  let facade: SolicitudesFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    facade = TestBed.inject(SolicitudesFacade);
  });

  afterEach(() => http.verify());

  it('abiertas sin filtros llama GET /open sin query params', async () => {
    const peticion = facade.abiertas();

    const req = http.expectOne(`${URL}/open`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 200, msg: 'Operación exitosa', data: [SOLICITUD] });

    expect((await peticion).length).toBe(1);
  });

  it('abiertas con filtros manda city y category_id como query', async () => {
    const peticion = facade.abiertas({ city: 'Santa Cruz', category_id: 1 });

    const req = http.expectOne(
      (request) =>
        request.url === `${URL}/open` &&
        request.params.get('city') === 'Santa Cruz' &&
        request.params.get('category_id') === '1',
    );
    req.flush({ status: 200, msg: 'Operación exitosa', data: [] });

    expect(await peticion).toEqual([]);
  });

  it('mias pide GET /mine (las del comprador)', async () => {
    const peticion = facade.mias();

    const req = http.expectOne(`${URL}/mine`);
    req.flush({ status: 200, msg: 'Operación exitosa', data: [SOLICITUD] });

    expect((await peticion)[0].status).toBe('PUBLISHED');
  });

  it('crear manda FormData (multipart con foto) y no JSON', async () => {
    const datos = new FormData();
    datos.append('category_id', '1');
    datos.append('description', 'Pastillas de freno delanteras');
    datos.append('city', 'Santa Cruz');
    datos.append('urgency', 'ALTA');

    const peticion = facade.crear(datos);

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    req.flush({ status: 201, msg: 'Solicitud creada', data: SOLICITUD });

    expect((await peticion).id).toBe(34);
  });
});
