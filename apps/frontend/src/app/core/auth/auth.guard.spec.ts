import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { AuthFacade } from '../../facades/auth.facade';
import { authGuard, roleGuard, soloPublicoGuard } from './auth.guard';
import { PANEL, Usuario } from './session.model';

function usuario(rol: Usuario['rol']): Usuario {
  return {
    id: 1,
    nombre: 'Persona',
    email: 'persona@repuestosya.com',
    telefono: null,
    ciudad: null,
    rol,
  };
}

describe('guards de sesión y rol', () => {
  let facade: AuthFacade;
  let router: Router;

  /** Ejecuta un guard fuera de una ruta, dentro del contexto de inyección. */
  function activar(guard: CanActivateFn): unknown {
    return TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  }

  function abrirSesion(rol: Usuario['rol']): void {
    facade.sesion.set({ token: 'tok', expiraEn: 3600, usuario: usuario(rol) });
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    facade = TestBed.inject(AuthFacade);
    router = TestBed.inject(Router);
  });

  afterEach(() => localStorage.clear());

  describe('authGuard', () => {
    it('sin sesión manda al login', () => {
      expect(activar(authGuard)).toEqual(router.createUrlTree(['/login']));
    });

    it('con sesión deja pasar', () => {
      abrirSesion('COMPRADOR');
      expect(activar(authGuard)).toBeTrue();
    });
  });

  describe('roleGuard', () => {
    it('con el rol correcto deja pasar', () => {
      abrirSesion('ADMIN');
      expect(activar(roleGuard('ADMIN'))).toBeTrue();
    });

    it('con otro rol no regresa al login: manda al panel de SU rol', () => {
      abrirSesion('COMPRADOR');

      const destino = activar(roleGuard('ADMIN')) as UrlTree;

      expect(destino.toString()).toBe(PANEL.COMPRADOR);
      expect(destino.toString()).not.toBe('/login');
    });

    it('sin sesión manda al login', () => {
      expect(String(activar(roleGuard('PROVEEDOR')))).toBe('/login');
    });

    it('acepta cualquiera de los roles listados', () => {
      abrirSesion('PROVEEDOR');
      expect(activar(roleGuard('COMPRADOR', 'PROVEEDOR'))).toBeTrue();
    });
  });

  describe('soloPublicoGuard', () => {
    it('deja entrar al login cuando no hay sesión', () => {
      expect(activar(soloPublicoGuard)).toBeTrue();
    });

    it('redirige al panel del rol cuando ya hay sesión', () => {
      abrirSesion('PROVEEDOR');
      expect(String(activar(soloPublicoGuard))).toBe(PANEL.PROVEEDOR);
    });
  });
});
