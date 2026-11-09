import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { PerfilProveedor, SuppliersFacade } from './suppliers.facade';

const ME_URL = `${environment.apiUrl}/suppliers/me`;
const ADMIN_URL = `${environment.apiUrl}/admin/suppliers`;

const PERFIL: PerfilProveedor = {
  id: 55,
  user_id: 7,
  business_name: 'AutoParts Center',
  city: 'Santa Cruz',
  phone: '70000000',
  category_ids: [1, 3],
  status: 'PENDING',
  rejection_reason: null,
  reviewed_by: null,
  reviewed_at: null,
  created_at: '2026-11-08T12:00:00Z',
  updated_at: '2026-11-08T12:00:00Z',
};

describe('SuppliersFacade', () => {
  let http: HttpTestingController;
  let facade: SuppliersFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    facade = TestBed.inject(SuppliersFacade);
  });

  afterEach(() => http.verify());

  it('miPerfil devuelve el perfil del contrato', async () => {
    const peticion = facade.miPerfil();

    const req = http.expectOne(ME_URL);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 200, msg: 'Perfil comercial', data: PERFIL });

    expect((await peticion)?.business_name).toBe('AutoParts Center');
  });

  it('miPerfil traduce el 404 del contrato en null (sin perfil, no error)', async () => {
    const peticion = facade.miPerfil();

    http
      .expectOne(ME_URL)
      .flush(
        { status: 404, msg: 'El proveedor no tiene un perfil comercial', data: null },
        { status: 404, statusText: 'Not Found' },
      );

    expect(await peticion).toBeNull();
  });

  it('miPerfil propaga un error que NO es 404', async () => {
    const peticion = facade.miPerfil().then(() => 'resuelta', () => 'rechazada');

    http
      .expectOne(ME_URL)
      .flush(
        { status: 500, msg: 'Error interno', data: null },
        { status: 500, statusText: 'Server Error' },
      );

    expect(await peticion).toBe('rechazada');
  });

  it('guardarPerfil manda PUT con los cuatro campos del contrato', async () => {
    const datos = {
      business_name: 'AutoParts Center',
      city: 'Santa Cruz',
      phone: '70000000',
      category_ids: [1, 3],
    };

    const peticion = facade.guardarPerfil(datos);

    const req = http.expectOne(ME_URL);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(datos);
    req.flush({ status: 200, msg: 'Perfil comercial guardado; pendiente de aprobación', data: PERFIL });

    const perfil = await peticion;
    // El contrato: cada PUT vuelve a PENDING.
    expect(perfil.status).toBe('PENDING');
  });

  it('listar sin filtro pide todos los perfiles', async () => {
    const peticion = facade.listar();

    const req = http.expectOne(ADMIN_URL);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 200, msg: 'Perfiles de proveedores', data: [PERFIL] });

    expect((await peticion).length).toBe(1);
  });

  it('listar con estado agrega el query param del contrato', async () => {
    const peticion = facade.listar('APPROVED');

    const req = http.expectOne(`${ADMIN_URL}?status=APPROVED`);
    req.flush({ status: 200, msg: 'Perfiles de proveedores', data: [] });

    expect(await peticion).toEqual([]);
  });

  it('aprobar hace POST al endpoint de aprobación', async () => {
    const aprobado = { ...PERFIL, status: 'APPROVED' as const, reviewed_by: 1 };

    const peticion = facade.aprobar(55);

    const req = http.expectOne(`${ADMIN_URL}/55/approve`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ status: 200, msg: 'Proveedor aprobado', data: aprobado });

    expect((await peticion).status).toBe('APPROVED');
  });

  it('rechazar manda el motivo como `reason` (nombre del contrato)', async () => {
    const peticion = facade.rechazar(55, 'Datos incompletos');

    const req = http.expectOne(`${ADMIN_URL}/55/reject`);
    expect(req.request.body).toEqual({ reason: 'Datos incompletos' });
    req.flush({
      status: 200,
      msg: 'Proveedor rechazado',
      data: { ...PERFIL, status: 'REJECTED', rejection_reason: 'Datos incompletos' },
    });

    expect((await peticion).status).toBe('REJECTED');
  });
});
