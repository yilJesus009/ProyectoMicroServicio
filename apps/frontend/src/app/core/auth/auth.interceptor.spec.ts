import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthFacade } from '../../facades/auth.facade';
import { authInterceptor } from './auth.interceptor';
import { Usuario } from './session.model';

const USUARIO: Usuario = {
  id: 7,
  nombre: 'Ana Comprador',
  email: 'ana@repuestosya.com',
  telefono: null,
  ciudad: null,
  rol: 'COMPRADOR',
};

const API = environment.apiUrl;

describe('authInterceptor', () => {
  let facade: AuthFacade;
  let client: HttpClient;
  let http: HttpTestingController;
  let router: Router;

  /** Lanza una petición real por HttpClient (que es lo que pasa por el interceptor). */
  function pedir(ruta: string): void {
    client.get(`${API}${ruta}`).subscribe({ next: () => undefined, error: () => undefined });
  }

  function abrirSesion(): void {
    localStorage.setItem('repuestosya_token', 'tok-123');
    localStorage.setItem('repuestosya_usuario', JSON.stringify(USUARIO));
    facade.sesion.set({ token: 'tok-123', expiraEn: 3600, usuario: USUARIO });
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    facade = TestBed.inject(AuthFacade);
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('no agrega Authorization cuando no hay sesión', () => {
    pedir('/part-requests');

    const req = http.expectOne(`${API}/part-requests`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ status: 200, msg: 'ok', data: [] });
  });

  it('agrega Bearer con el token guardado', () => {
    abrirSesion();
    pedir('/part-requests');

    const req = http.expectOne(`${API}/part-requests`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-123');
    req.flush({ status: 200, msg: 'ok', data: [] });
  });

  it('un 401 en ruta protegida cierra la sesión y manda al login', () => {
    abrirSesion();
    pedir('/part-requests');

    const req = http.expectOne(`${API}/part-requests`);
    req.flush(
      { status: 401, msg: 'Token inválido', data: null },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(facade.autenticado()).toBeFalse();
    expect(localStorage.getItem('repuestosya_token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('un 401 en el login NO cierra la sesión (son credenciales mal, no sesión vencida)', async () => {
    abrirSesion();

    const peticion = facade
      .login({ email: USUARIO.email, contrasena: 'mala' })
      .then(() => 'resuelta', () => 'rechazada');

    const req = http.expectOne(`${API}/auth/login`);
    // Aunque haya sesión, una ruta pública no lleva el token.
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush(
      { status: 401, msg: 'Credenciales incorrectas', data: null },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(await peticion).toBe('rechazada');
    expect(facade.autenticado()).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('las rutas públicas viajan sin Authorization', () => {
    pedir('/auth/register');

    const req = http.expectOne(`${API}/auth/register`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ status: 201, msg: 'ok', data: USUARIO });
  });
});
