import { Routes } from '@angular/router';

import { authGuard, roleGuard, soloPublicoGuard } from './core/auth/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { RegistroComponent } from './features/auth/registro/registro.component';
import { LayoutComponent } from './features/layout/layout.component';
import { PaginaVaciaComponent } from './shared/pagina-vacia/pagina-vacia.component';

/**
 * Rutas de la aplicación: las de docs/frontend.md.
 *
 * - `/login` y `/registro` son públicas.
 * - Todo lo demás cuelga de un layout con sesión y con el menú de su rol.
 * - En la fase 1 cada ruta apunta a PaginaVaciaComponent; en la fase 2 se
 *   cambia SOLO el `component` de cada una.
 *
 * `title` es lo que se ve en la pestaña; `data.titulo` es lo que muestra la
 * pantalla vacía. Se mantienen iguales a propósito.
 */
export const routes: Routes = [
  { path: 'login', title: 'Iniciar sesión', component: LoginComponent, canActivate: [soloPublicoGuard] },
  { path: 'registro', title: 'Crear cuenta', component: RegistroComponent, canActivate: [soloPublicoGuard] },

  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      // Al entrar a la raíz cada persona va a su panel; si el rol no coincide
      // con la ruta, roleGuard la redirige al panel de SU rol.
      { path: '', redirectTo: 'comprador/solicitudes', pathMatch: 'full' },

      // --- Comprador -------------------------------------------------------
      {
        path: 'comprador/solicitudes',
        title: 'Mis solicitudes',
        data: { titulo: 'Mis solicitudes' },
        component: PaginaVaciaComponent,
        canActivate: [roleGuard('COMPRADOR')],
      },
      {
        path: 'comprador/solicitudes/nueva',
        title: 'Nueva solicitud',
        data: { titulo: 'Nueva solicitud' },
        component: PaginaVaciaComponent,
        canActivate: [roleGuard('COMPRADOR')],
      },
      {
        path: 'comprador/solicitudes/:id',
        title: 'Detalle de solicitud',
        data: { titulo: 'Detalle de solicitud y comparador de ofertas' },
        component: PaginaVaciaComponent,
        canActivate: [roleGuard('COMPRADOR')],
      },
      {
        path: 'comprador/pedidos',
        title: 'Mis pedidos',
        data: { titulo: 'Mis pedidos' },
        component: PaginaVaciaComponent,
        canActivate: [roleGuard('COMPRADOR')],
      },
      {
        path: 'comprador/pedidos/:id',
        title: 'Seguimiento del pedido',
        data: { titulo: 'Seguimiento del pedido' },
        component: PaginaVaciaComponent,
        canActivate: [roleGuard('COMPRADOR')],
      },
      {
        path: 'comprador/pedidos/:id/pago',
        title: 'Pago simulado',
        data: { titulo: 'Pago simulado' },
        component: PaginaVaciaComponent,
        canActivate: [roleGuard('COMPRADOR')],
      },
      {
        path: 'comprador/vehiculos',
        title: 'Mis vehículos',
        data: { titulo: 'Mis vehículos' },
        component: PaginaVaciaComponent,
        canActivate: [roleGuard('COMPRADOR')],
      },

      // --- Proveedor -------------------------------------------------------
      {
        path: 'proveedor/perfil',
        title: 'Perfil comercial',
        data: { titulo: 'Perfil comercial' },
        component: PaginaVaciaComponent,
        canActivate: [roleGuard('PROVEEDOR')],
      },
      {
        path: 'proveedor/solicitudes',
        title: 'Solicitudes abiertas',
        data: { titulo: 'Solicitudes abiertas' },
        component: PaginaVaciaComponent,
        canActivate: [roleGuard('PROVEEDOR')],
      },
      {
        path: 'proveedor/solicitudes/:id/ofertar',
        title: 'Enviar oferta',
        data: { titulo: 'Enviar oferta' },
        component: PaginaVaciaComponent,
        canActivate: [roleGuard('PROVEEDOR')],
      },
      {
        path: 'proveedor/ofertas',
        title: 'Mis ofertas',
        data: { titulo: 'Mis ofertas' },
        component: PaginaVaciaComponent,
        canActivate: [roleGuard('PROVEEDOR')],
      },
      {
        path: 'proveedor/pedidos',
        title: 'Mis pedidos',
        data: { titulo: 'Mis pedidos del proveedor' },
        component: PaginaVaciaComponent,
        canActivate: [roleGuard('PROVEEDOR')],
      },

      // --- Admin -----------------------------------------------------------
      {
        path: 'admin/proveedores',
        title: 'Proveedores pendientes',
        data: { titulo: 'Proveedores pendientes' },
        component: PaginaVaciaComponent,
        canActivate: [roleGuard('ADMIN')],
      },
      {
        path: 'admin/categorias',
        title: 'Categorías',
        data: { titulo: 'Categorías' },
        component: PaginaVaciaComponent,
        canActivate: [roleGuard('ADMIN')],
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
