import { Rol } from '../../core/auth/session.model';

/** Un enlace del menú lateral. */
export interface ItemMenu {
  readonly etiqueta: string;
  readonly ruta: string;
}

/**
 * Menú lateral de cada rol (docs/frontend.md → "un layout con barra superior
 * y menú distinto para COMPRADOR, PROVEEDOR y ADMIN").
 *
 * Son rutas REALES de docs/frontend.md: en la fase 1 llevan a pantallas
 * vacías, y en la fase 2 se les reemplaza el contenido sin tocar este
 * archivo.
 */
export const MENU_POR_ROL: Record<Rol, readonly ItemMenu[]> = {
  COMPRADOR: [
    { etiqueta: 'Mis solicitudes', ruta: '/comprador/solicitudes' },
    { etiqueta: 'Nueva solicitud', ruta: '/comprador/solicitudes/nueva' },
    { etiqueta: 'Mis pedidos', ruta: '/comprador/pedidos' },
    { etiqueta: 'Mis vehículos', ruta: '/comprador/vehiculos' },
  ],
  PROVEEDOR: [
    { etiqueta: 'Perfil comercial', ruta: '/proveedor/perfil' },
    { etiqueta: 'Solicitudes abiertas', ruta: '/proveedor/solicitudes' },
    { etiqueta: 'Mis ofertas', ruta: '/proveedor/ofertas' },
    { etiqueta: 'Mis pedidos', ruta: '/proveedor/pedidos' },
  ],
  ADMIN: [
    { etiqueta: 'Proveedores pendientes', ruta: '/admin/proveedores' },
    { etiqueta: 'Categorías', ruta: '/admin/categorias' },
  ],
};

/** Nombre amable del rol para el toolbar. */
export const NOMBRE_ROL: Record<Rol, string> = {
  COMPRADOR: 'Comprador',
  PROVEEDOR: 'Proveedor',
  ADMIN: 'Administrador',
};
