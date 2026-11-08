import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { CatalogoFacade } from './catalogo.facade';

const CATEGORIAS_URL = `${environment.apiUrl}/categories`;
const ADMIN_CATEGORIAS_URL = `${environment.apiUrl}/admin/categories`;
const VEHICULOS_URL = `${environment.apiUrl}/vehicles`;

const CATEGORIA = {
  id: 1,
  name: 'Frenos',
  description: 'Pastillas, discos y calipers',
  icon: 'brake',
  active: true,
};

const VEHICULO = { id: 9, brand: 'Toyota', model: 'Corolla', year: 2018, plate: 'ABC123' };

describe('CatalogoFacade', () => {
  let http: HttpTestingController;
  let facade: CatalogoFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    facade = TestBed.inject(CatalogoFacade);
  });

  afterEach(() => http.verify());

  it('categoriasActivas pide GET /categories (las activas)', async () => {
    const peticion = facade.categoriasActivas();

    const req = http.expectOne(CATEGORIAS_URL);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 200, msg: 'Operación exitosa', data: [CATEGORIA] });

    expect((await peticion)[0].name).toBe('Frenos');
  });

  it('categoriasTodas pide /admin/categories (incluye inactivas)', async () => {
    const peticion = facade.categoriasTodas();

    const req = http.expectOne(ADMIN_CATEGORIAS_URL);
    req.flush({ status: 200, msg: 'Operación exitosa', data: [CATEGORIA] });

    expect((await peticion).length).toBe(1);
  });

  it('crearCategoria manda POST con name, description e icon', async () => {
    const datos = { name: 'Frenos', description: 'Pastillas', icon: 'brake' };

    const peticion = facade.crearCategoria(datos);

    const req = http.expectOne(ADMIN_CATEGORIAS_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);
    req.flush({ status: 201, msg: 'Categoría creada', data: CATEGORIA });

    expect((await peticion).id).toBe(1);
  });

  it('editarCategoria manda PUT al id correcto', async () => {
    const datos = { name: 'Frenos y embragues' };

    const peticion = facade.editarCategoria(1, datos);

    const req = http.expectOne(`${ADMIN_CATEGORIAS_URL}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ status: 200, msg: 'Categoría actualizada', data: CATEGORIA });

    expect(await peticion).toBeTruthy();
  });

  it('alternarCategoria hace PATCH al toggle', async () => {
    const peticion = facade.alternarCategoria(1);

    const req = http.expectOne(`${ADMIN_CATEGORIAS_URL}/1/toggle`);
    expect(req.request.method).toBe('PATCH');
    req.flush({
      status: 200,
      msg: 'Estado actualizado',
      data: { ...CATEGORIA, active: false },
    });

    expect((await peticion).active).toBeFalse();
  });

  it('misVehiculos pide GET /vehicles/mine', async () => {
    const peticion = facade.misVehiculos();

    const req = http.expectOne(`${VEHICULOS_URL}/mine`);
    req.flush({ status: 200, msg: 'Operación exitosa', data: [VEHICULO] });

    expect((await peticion)[0].brand).toBe('Toyota');
  });

  it('crearVehiculo manda POST con los campos del contrato', async () => {
    const datos = { brand: 'Toyota', model: 'Corolla', year: 2018, plate: 'ABC123' };

    const peticion = facade.crearVehiculo(datos);

    const req = http.expectOne(VEHICULOS_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);
    req.flush({ status: 201, msg: 'Vehículo registrado', data: VEHICULO });

    expect((await peticion).year).toBe(2018);
  });

  it('borrarVehiculo hace DELETE al id del vehículo', async () => {
    const peticion = facade.borrarVehiculo(9).then(() => 'hecho');

    const req = http.expectOne(`${VEHICULOS_URL}/9`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ status: 200, msg: 'Vehículo eliminado', data: null });

    expect(await peticion).toBe('hecho');
  });
});
