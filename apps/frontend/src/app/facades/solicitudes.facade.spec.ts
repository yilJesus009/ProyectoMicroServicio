import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { DatosOferta, SolicitudesFacade } from './solicitudes.facade';

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

const OFERTA = {
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

  it('detalle pide GET /part-requests/{id}', async () => {
    const peticion = facade.detalle(34);

    const req = http.expectOne(`${URL}/34`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 200, msg: 'Operación exitosa', data: SOLICITUD });

    expect((await peticion).id).toBe(34);
  });

  it('ofertas sin orden no manda query y con orden manda sort', async () => {
    const sinOrden = facade.ofertas(34);
    const req1 = http.expectOne(`${URL}/34/offers`);
    expect(req1.request.params.keys()).toEqual([]);
    req1.flush({ status: 200, msg: 'Ofertas encontradas', data: [OFERTA] });
    expect((await sinOrden)[0].id).toBe(78);

    const ordenada = facade.ofertas(34, 'price');
    const req2 = http.expectOne(
      (request) => request.url === `${URL}/34/offers` && request.params.get('sort') === 'price',
    );
    req2.flush({ status: 200, msg: 'Ofertas encontradas', data: [OFERTA] });
    expect((await ordenada).length).toBe(1);
  });

  it('enviarOferta manda POST con el body snake_case del contrato', async () => {
    const datos: DatosOferta = {
      price: 620,
      brand: 'KYB',
      condition: 'NEW',
      availability: 'IN_STOCK',
      delivery_type: 'DELIVERY',
      estimated_days: 2,
    };

    const peticion = facade.enviarOferta(34, datos);

    const req = http.expectOne(`${URL}/34/offers`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);
    req.flush({ status: 201, msg: 'Oferta enviada', data: OFERTA });

    expect((await peticion).id).toBe(78);
  });

  it('aceptar hace POST a /offers/{id}/accept y devuelve offer y part_request', async () => {
    const peticion = facade.aceptar(78);

    const req = http.expectOne(`${environment.apiUrl}/offers/78/accept`);
    expect(req.request.method).toBe('POST');
    req.flush({
      status: 200,
      msg: 'Oferta aceptada',
      data: {
        offer: { ...OFERTA, status: 'ACCEPTED' },
        part_request: { ...SOLICITUD, status: 'OFFER_ACCEPTED' },
      },
    });

    const resultado = await peticion;
    expect(resultado.offer.status).toBe('ACCEPTED');
    expect(resultado.part_request.status).toBe('OFFER_ACCEPTED');
  });

  it('misOfertas pide GET /offers/mine', async () => {
    const peticion = facade.misOfertas();

    const req = http.expectOne(`${environment.apiUrl}/offers/mine`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 200, msg: 'Ofertas encontradas', data: [OFERTA] });

    expect((await peticion)[0].supplier_name).toBe('AutoParts Center');
  });

  it('retirar hace PATCH a /offers/{id}/withdraw', async () => {
    const peticion = facade.retirar(78);

    const req = http.expectOne(`${environment.apiUrl}/offers/78/withdraw`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ status: 200, msg: 'Oferta retirada', data: { ...OFERTA, status: 'WITHDRAWN' } });

    expect((await peticion).status).toBe('WITHDRAWN');
  });
});
