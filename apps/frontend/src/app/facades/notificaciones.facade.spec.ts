import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { Aviso, NotificacionesFacade } from './notificaciones.facade';

const URL = `${environment.apiUrl}/notifications`;

const AVISO: Aviso = {
  id: 12,
  type: 'SUPPLIER_APPROVED',
  title: 'Perfil aprobado',
  message: 'Tu perfil comercial fue aprobado',
  link: '/proveedor/solicitudes',
  read: false,
  created_at: '2026-11-08T12:00:00Z',
};

describe('NotificacionesFacade', () => {
  let http: HttpTestingController;
  let facade: NotificacionesFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    facade = TestBed.inject(NotificacionesFacade);
  });

  afterEach(() => http.verify());

  it('sinLeer devuelve el count del contrato', async () => {
    const peticion = facade.sinLeer();

    const req = http.expectOne(`${URL}/unread-count`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 200, msg: 'Conteo de avisos sin leer', data: { count: 3 } });

    expect(await peticion).toBe(3);
  });

  it('avisos sin filtro llama /mine sin params', async () => {
    const peticion = facade.avisos();

    const req = http.expectOne(`${URL}/mine`);
    req.flush({ status: 200, msg: 'Avisos encontrados', data: [AVISO] });

    expect((await peticion)[0].title).toBe('Perfil aprobado');
  });

  it('avisos(true) agrega ?unread=true (lo de la campanita)', async () => {
    const peticion = facade.avisos(true);

    const req = http.expectOne(
      (request) => request.url === `${URL}/mine` && request.params.get('unread') === 'true',
    );
    req.flush({ status: 200, msg: 'Avisos encontrados', data: [AVISO] });

    expect((await peticion).length).toBe(1);
  });

  it('marcarLeida hace PATCH al aviso con su id', async () => {
    const peticion = facade.marcarLeida(12).then(() => 'hecho');

    const req = http.expectOne(`${URL}/12/read`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ status: 200, msg: 'Aviso marcado como leído', data: null });

    expect(await peticion).toBe('hecho');
  });

  it('marcarTodasLeidas hace PATCH a read-all', async () => {
    const peticion = facade.marcarTodasLeidas().then(() => 'hecho');

    const req = http.expectOne(`${URL}/read-all`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ status: 200, msg: 'Avisos marcados como leídos', data: null });

    expect(await peticion).toBe('hecho');
  });
});
