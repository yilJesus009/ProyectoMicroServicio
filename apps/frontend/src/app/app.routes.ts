import { Routes } from '@angular/router';

import { authGuard, roleGuard, soloPublicoGuard } from './core/auth/auth.guard';
import { AdminCategoriasComponent } from './features/admin/categorias/categorias.component';
import { AdminProveedoresComponent } from './features/admin/proveedores/proveedores.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegistroComponent } from './features/auth/registro/registro.component';
import { MisSolicitudesComponent } from './features/comprador/mis-solicitudes/mis-solicitudes.component';
import { NuevaSolicitudComponent } from './features/comprador/nueva-solicitud/nueva-solicitud.component';
import { DetalleSolicitudComponent } from './features/comprador/detalle-solicitud/detalle-solicitud.component';
import { MisPedidosComponent } from './features/comprador/mis-pedidos/mis-pedidos.component';
import { PagoComponent } from './features/comprador/pago/pago.component';
import { SeguimientoComponent } from './features/comprador/seguimiento/seguimiento.component';
import { VehiculosComponent } from './features/comprador/vehiculos/vehiculos.component';
import { LayoutComponent } from './features/layout/layout.component';
import { MisOfertasComponent } from './features/proveedor/mis-ofertas/mis-ofertas.component';
import { OfertarComponent } from './features/proveedor/ofertar/ofertar.component';
import { PedidosProveedorComponent } from './features/proveedor/pedidos/pedidos-proveedor.component';
import { PerfilProveedorComponent } from './features/proveedor/perfil/perfil.component';
import { SolicitudesAbiertasComponent } from './features/proveedor/solicitudes/solicitudes-abiertas.component';

/**
 * Rutas de la aplicación: las de docs/frontend.md.
 *
 * - `/login` y `/registro` son públicas.
 * - Todo lo demás cuelga de un layout con sesión y con el menú de su rol.
 * - Todas las pantallas de docs/frontend.md apuntan a su componente real
 *   (fase 2: perfil, solicitudes, admin, vehículos; fase 3: comparador,
 *   ofertas y pantallas de pedidos).
 *
 * `title` es lo que se ve en la pestaña; `data.titulo` es lo que muestra la
 * pantalla. Se mantienen iguales a propósito.
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
        component: MisSolicitudesComponent,
        canActivate: [roleGuard('COMPRADOR')],
      },
      {
        path: 'comprador/solicitudes/nueva',
        title: 'Nueva solicitud',
        data: { titulo: 'Nueva solicitud' },
        component: NuevaSolicitudComponent,
        canActivate: [roleGuard('COMPRADOR')],
      },
      {
        path: 'comprador/solicitudes/:id',
        title: 'Detalle de solicitud',
        data: { titulo: 'Detalle de solicitud y comparador de ofertas' },
        component: DetalleSolicitudComponent,
        canActivate: [roleGuard('COMPRADOR')],
      },
      {
        path: 'comprador/pedidos',
        title: 'Mis pedidos',
        data: { titulo: 'Mis pedidos' },
        component: MisPedidosComponent,
        canActivate: [roleGuard('COMPRADOR')],
      },
      {
        path: 'comprador/pedidos/:id',
        title: 'Seguimiento del pedido',
        data: { titulo: 'Seguimiento del pedido' },
        component: SeguimientoComponent,
        canActivate: [roleGuard('COMPRADOR')],
      },
      {
        path: 'comprador/pedidos/:id/pago',
        title: 'Pago simulado',
        data: { titulo: 'Pago simulado' },
        component: PagoComponent,
        canActivate: [roleGuard('COMPRADOR')],
      },
      {
        path: 'comprador/vehiculos',
        title: 'Mis vehículos',
        data: { titulo: 'Mis vehículos' },
        component: VehiculosComponent,
        canActivate: [roleGuard('COMPRADOR')],
      },

      // --- Proveedor -------------------------------------------------------
      {
        path: 'proveedor/perfil',
        title: 'Perfil comercial',
        data: { titulo: 'Perfil comercial' },
        component: PerfilProveedorComponent,
        canActivate: [roleGuard('PROVEEDOR')],
      },
      {
        path: 'proveedor/solicitudes',
        title: 'Solicitudes abiertas',
        data: { titulo: 'Solicitudes abiertas' },
        component: SolicitudesAbiertasComponent,
        canActivate: [roleGuard('PROVEEDOR')],
      },
      {
        path: 'proveedor/solicitudes/:id/ofertar',
        title: 'Enviar oferta',
        data: { titulo: 'Enviar oferta' },
        component: OfertarComponent,
        canActivate: [roleGuard('PROVEEDOR')],
      },
      {
        path: 'proveedor/ofertas',
        title: 'Mis ofertas',
        data: { titulo: 'Mis ofertas' },
        component: MisOfertasComponent,
        canActivate: [roleGuard('PROVEEDOR')],
      },
      {
        path: 'proveedor/pedidos',
        title: 'Mis pedidos',
        data: { titulo: 'Mis pedidos del proveedor' },
        component: PedidosProveedorComponent,
        canActivate: [roleGuard('PROVEEDOR')],
      },

      // --- Admin -----------------------------------------------------------
      {
        path: 'admin/proveedores',
        title: 'Proveedores pendientes',
        data: { titulo: 'Proveedores pendientes' },
        component: AdminProveedoresComponent,
        canActivate: [roleGuard('ADMIN')],
      },
      {
        path: 'admin/categorias',
        title: 'Categorías',
        data: { titulo: 'Categorías' },
        component: AdminCategoriasComponent,
        canActivate: [roleGuard('ADMIN')],
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
