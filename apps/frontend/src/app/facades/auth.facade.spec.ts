import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import { Usuario } from '../core/auth/session.model';
import { AuthFacade } from './auth.facade';

const USUARIO: Usuario = {
  id: 7,
  nombre: 'Ana Comprador',
  email: 'ana@repuestosya.com',
  telefono: '70000000',
  ciudad: 'Santa Cruz',
  rol: 'COMPRADOR',
};

const LOGIN_URL = `${environment.apiUrl}/auth/login`;
const REGISTER_URL = `${environment.apiUrl}/auth/register`;

/** Deja correr los microtasks encadenados (register → login). */
const ceder = () => new Promise<void>((resolver) => setTimeout(resolver, 0));

describe('AuthFacade', () => {
  let http: HttpTestingController;

  // La fachada NO se inyecta acá: leer localStorage es parte de su
  // construcción, y cada prueba la arma en el momento que necesita.
  function fachada(): AuthFacade {
    return TestBed.inject(AuthFacade);
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('arranca sin sesión cuando no hay nada guardado', () => {
    expect(fachada().autenticado()).toBeFalse();
    expect(fachada().rol()).toBeNull();
  });

  it('restaura la sesión desde el almacenamiento al recargar', () => {
    localStorage.setItem('repuestosya_token', 'token-viejo');
    localStorage.setItem('repuestosya_usuario', JSON.stringify(USUARIO));

    // Misma inyección que haría el arranque de la aplicación.
    const recargada = fachada();

    expect(recargada.autenticado()).toBeTrue();
    expect(recargada.sesion()?.token).toBe('token-viejo');
    expect(recargada.rol()).toBe('COMPRADOR');
  });

  it('ignora un usuario guardado corrupto', () => {
    localStorage.setItem('repuestosya_token', 'token-viejo');
    localStorage.setItem('repuestosya_usuario', 'esto no es json');

    expect(fachada().autenticado()).toBeFalse();
  });

  it('login guarda token y usuario en la señal y en localStorage', async () => {
    const facade = fachada();
    const peticion = facade.login({ email: USUARIO.email, contrasena: 'secreta123' });

    const req = http.expectOne(LOGIN_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: USUARIO.email, contrasena: 'secreta123' });
    req.flush({
      status: 200,
      msg: 'Inicio de sesión exitoso',
      data: { token: 'tok-123', expires_in: 3600, usuario: USUARIO },
    });

    const usuario = await peticion;

    expect(usuario.rol).toBe('COMPRADOR');
    expect(facade.autenticado()).toBeTrue();
    expect(facade.sesion()?.token).toBe('tok-123');
    expect(facade.sesion()?.expiraEn).toBe(3600);
    expect(localStorage.getItem('repuestosya_token')).toBe('tok-123');
  });

  it('login con credenciales incorrectas no deja sesión abierta', async () => {
    const facade = fachada();
    const peticion = facade
      .login({ email: USUARIO.email, contrasena: 'mala' })
      .then(() => 'resuelta', () => 'rechazada');

    const req = http.expectOne(LOGIN_URL);
    req.flush(
      { status: 401, msg: 'Credenciales incorrectas', data: null },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(await peticion).toBe('rechazada');
    expect(facade.autenticado()).toBeFalse();
    expect(localStorage.getItem('repuestosya_token')).toBeNull();
  });

  it('registro manda el body del contrato y devuelve el usuario', async () => {
    const facade = fachada();
    const datos = {
      nombre: 'Ana',
      email: USUARIO.email,
      contrasena: 'secreta123',
      rol: 'COMPRADOR' as const,
    };

    const peticion = facade.registro(datos);

    const req = http.expectOne(REGISTER_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);
    req.flush({ status: 201, msg: 'Usuario registrado exitosamente', data: USUARIO });

    const usuario = await peticion;
    expect(usuario.id).toBe(USUARIO.id);
    // El registro NO emite token: todavía no hay sesión.
    expect(facade.autenticado()).toBeFalse();
  });

  it('registroYEntrar registra y después inicia sesión con lo mismo', async () => {
    const facade = fachada();
    const datos = {
      nombre: 'Ana',
      email: USUARIO.email,
      contrasena: 'secreta123',
      rol: 'COMPRADOR' as const,
    };

    const peticion = facade.registroYEntrar(datos);

    http
      .expectOne(REGISTER_URL)
      .flush({ status: 201, msg: 'Usuario registrado exitosamente', data: USUARIO });

    // El login sale después de que el registro resuelve.
    await ceder();

    const login = http.expectOne(LOGIN_URL);
    expect(login.request.body).toEqual({ email: USUARIO.email, contrasena: 'secreta123' });
    login.flush({
      status: 200,
      msg: 'Inicio de sesión exitoso',
      data: { token: 'tok-123', expires_in: 3600, usuario: USUARIO },
    });

    await peticion;
    expect(facade.autenticado()).toBeTrue();
    expect(facade.sesion()?.token).toBe('tok-123');
  });

  it('cerrarSesion limpia el almacenamiento y la señal', () => {
    const facade = fachada();
    localStorage.setItem('repuestosya_token', 'tok-123');
    localStorage.setItem('repuestosya_usuario', JSON.stringify(USUARIO));
    facade.sesion.set({ token: 'tok-123', expiraEn: 3600, usuario: USUARIO });

    facade.cerrarSesion();

    expect(facade.autenticado()).toBeFalse();
    expect(localStorage.getItem('repuestosya_token')).toBeNull();
    expect(localStorage.getItem('repuestosya_usuario')).toBeNull();
  });

  it('panel devuelve la ruta del rol que inició sesión', () => {
    const facade = fachada();
    facade.sesion.set({ token: 't', expiraEn: 60, usuario: USUARIO });

    expect(facade.panel()).toBe('/comprador/solicitudes');
  });
});
