import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  RouterStateSnapshot,
  Routes,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { authGuard, soloPublicoGuard } from './core/auth/auth.guard';
import { routes } from './app.routes';
import { PANEL, Rol, Usuario } from './core/auth/session.model';
import { AuthFacade } from './facades/auth.facade';
import { AdminCategoriasComponent } from './features/admin/categorias/categorias.component';
import { AdminProveedoresComponent } from './features/admin/proveedores/proveedores.component';
import { MisSolicitudesComponent } from './features/comprador/mis-solicitudes/mis-solicitudes.component';
import { NuevaSolicitudComponent } from './features/comprador/nueva-solicitud/nueva-solicitud.component';
import { DetalleSolicitudComponent } from './features/comprador/detalle-solicitud/detalle-solicitud.component';
import { MisPedidosComponent } from './features/comprador/mis-pedidos/mis-pedidos.component';
import { PagoComponent } from './features/comprador/pago/pago.component';
import { SeguimientoComponent } from './features/comprador/seguimiento/seguimiento.component';
import { VehiculosComponent } from './features/comprador/vehiculos/vehiculos.component';
import { MisOfertasComponent } from './features/proveedor/mis-ofertas/mis-ofertas.component';
import { OfertarComponent } from './features/proveedor/ofertar/ofertar.component';
import { PedidosProveedorComponent } from './features/proveedor/pedidos/pedidos-proveedor.component';
import { PerfilProveedorComponent } from './features/proveedor/perfil/perfil.component';
import { SolicitudesAbiertasComponent } from './features/proveedor/solicitudes/solicitudes-abiertas.component';

/** Todas las rutas del árbol, aplanadas y con la raíz al frente. */
function aplanar(rutas: Routes, prefijo = ''): string[] {
  return rutas.flatMap((ruta) => {
    // La raíz (path: '') no agrega segmento: sus hijos cuelgan de '/'.
    const actual =
      ruta.path === undefined || ruta.path === '' ? prefijo : `${prefijo}/${ruta.path}`;
    return ruta.children ? aplanar(ruta.children, actual) : [actual];
  });
}

function usuario(rol: Rol): Usuario {
  return { id: 1, nombre: 'Persona', email: 'p@r.c', telefono: null, ciudad: null, rol };
}

/** Rutas de docs/frontend.md (sin la raíz y sin el comodín). */
const RUTAS_DE_DOCUMENTACION = [
  '/login',
  '/registro',
  '/comprador/solicitudes',
  '/comprador/solicitudes/nueva',
  '/comprador/solicitudes/:id',
  '/comprador/pedidos',
  '/comprador/pedidos/:id',
  '/comprador/pedidos/:id/pago',
  '/comprador/vehiculos',
  '/proveedor/perfil',
  '/proveedor/solicitudes',
  '/proveedor/solicitudes/:id/ofertar',
  '/proveedor/ofertas',
  '/proveedor/pedidos',
  '/admin/proveedores',
  '/admin/categorias',
];

describe('tabla de rutas', () => {
  /** Rol que cada prefijo espera (lo que dice docs/frontend.md). */
  const ROL_ESPERADO: Record<string, Rol> = {
    comprador: 'COMPRADOR',
    proveedor: 'PROVEEDOR',
    admin: 'ADMIN',
  };

  let pantallas: Routes;
  let guardsDelLayout: readonly CanActivateFn[];

  /**
   * Cadena COMPLETA que corre el Router para una pantalla: primero los
   * guards del layout (ruta padre) y luego los de la pantalla (hijo).
   */
  function cadenaDe(pantalla: Routes[number]): readonly CanActivateFn[] {
    return [...guardsDelLayout, ...((pantalla.canActivate ?? []) as unknown as CanActivateFn[])];
  }

  /** Corre esa cadena con la sesión dada. */
  function entrar(pantalla: Routes[number], rol: Rol | null): unknown {
    TestBed.inject(AuthFacade).sesion.set(
      rol ? { token: 't', expiraEn: 60, usuario: usuario(rol) } : null,
    );

    let resultado: unknown = true;
    for (const guard of cadenaDe(pantalla)) {
      resultado = TestBed.runInInjectionContext(() =>
        guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      );
      if (resultado !== true) break;
    }
    return resultado;
  }

  const registradas = aplanar(routes).filter((ruta) => ruta !== '' && ruta !== '/**');

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    });
    const layout = routes.find((ruta) => ruta.path === '');
    pantallas = layout?.children ?? [];
    guardsDelLayout = (layout?.canActivate ?? []) as unknown as readonly CanActivateFn[];
  });

  afterEach(() => localStorage.clear());

  it('tiene exactamente las rutas de docs/frontend.md', () => {
    expect(registradas.slice().sort()).toEqual(RUTAS_DE_DOCUMENTACION.slice().sort());
  });

  it('las pantallas de la fase 2 montan su componente real', () => {
    const FASE_2: Record<string, Type<unknown>> = {
      'comprador/solicitudes': MisSolicitudesComponent,
      'comprador/solicitudes/nueva': NuevaSolicitudComponent,
      'comprador/vehiculos': VehiculosComponent,
      'proveedor/perfil': PerfilProveedorComponent,
      'proveedor/solicitudes': SolicitudesAbiertasComponent,
      'admin/proveedores': AdminProveedoresComponent,
      'admin/categorias': AdminCategoriasComponent,
    };

    for (const [ruta, componente] of Object.entries(FASE_2)) {
      expect(pantallas.find((pantalla) => pantalla.path === ruta)?.component).toBe(componente);
    }

    // Pantallas de la fase 3 entregadas (ofertas).
    const FASE_3_OFERTAS: Record<string, Type<unknown>> = {
      'comprador/solicitudes/:id': DetalleSolicitudComponent,
      'proveedor/solicitudes/:id/ofertar': OfertarComponent,
      'proveedor/ofertas': MisOfertasComponent,
    };

    for (const [ruta, componente] of Object.entries(FASE_3_OFERTAS)) {
      expect(pantallas.find((pantalla) => pantalla.path === ruta)?.component).toBe(componente);
    }

    // Pantallas de la fase 3 entregadas (pedidos).
    const FASE_3_PEDIDOS: Record<string, Type<unknown>> = {
      'comprador/pedidos': MisPedidosComponent,
      'comprador/pedidos/:id': SeguimientoComponent,
      'comprador/pedidos/:id/pago': PagoComponent,
      'proveedor/pedidos': PedidosProveedorComponent,
    };

    for (const [ruta, componente] of Object.entries(FASE_3_PEDIDOS)) {
      expect(pantallas.find((pantalla) => pantalla.path === ruta)?.component).toBe(componente);
    }
  });

  it('las públicas están protegidas por soloPublicoGuard', () => {
    for (const ruta of ['/login', '/registro']) {
      const encontrada = routes.find((r) => `/${r.path}` === ruta);
      expect(encontrada?.canActivate).toContain(soloPublicoGuard);
    }
  });

  it('cada pantalla exige sesión y el rol que le corresponde', () => {
    const protegidas = pantallas.filter((hija) => hija.path !== '');

    expect(protegidas.length).toBe(RUTAS_DE_DOCUMENTACION.length - 2);

    for (const pantalla of protegidas) {
      const prefijo = (pantalla.path ?? '').split('/')[0];
      const rol = ROL_ESPERADO[prefijo];
      const guards = cadenaDe(pantalla);

      expect(guards).toContain(authGuard);
      expect(guards.length).toBe(2);

      expect(entrar(pantalla, rol)).toBeTrue();

      const otroRol: Rol = rol === 'ADMIN' ? 'COMPRADOR' : 'ADMIN';
      const rolIncorrecto = entrar(pantalla, otroRol) as UrlTree;
      expect(rolIncorrecto.toString()).toBe(PANEL[otroRol]);
    }
  });

  it('sin sesión ninguna pantalla de rol deja entrar', () => {
    for (const pantalla of pantallas.filter((hija) => hija.path !== '')) {
      const resultado = entrar(pantalla, null) as UrlTree;
      expect(resultado.toString()).toBe('/login');
    }
  });

  it('toda pantalla vacía lleva un título para mostrar', () => {
    for (const pantalla of pantallas.filter((hija) => hija.path !== '')) {
      expect(pantalla.data?.['titulo']).toBeTruthy();
      expect(pantalla.title).toBeTruthy();
    }
  });
});
