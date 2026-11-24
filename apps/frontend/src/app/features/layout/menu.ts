import { Rol } from '../../core/auth/session.model';

/** Ícono de un ítem de menú: PNG propio (DISEÑO.md sección 10) o ícono de Material. */
export interface IconoMenu {
  readonly tipo: 'propio' | 'material';
  readonly nombre: string;
}

/** Un enlace del menú lateral. */
export interface ItemMenu {
  readonly etiqueta: string;
  readonly ruta: string;
  readonly icono: IconoMenu;
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
    {
      etiqueta: 'Mis solicitudes',
      ruta: '/comprador/solicitudes',
      icono: { tipo: 'propio', nombre: 'mis-solicitudes' },
    },
    {
      etiqueta: 'Nueva solicitud',
      ruta: '/comprador/solicitudes/nueva',
      icono: { tipo: 'propio', nombre: 'nueva-solicitud' },
    },
    {
      etiqueta: 'Mis pedidos',
      ruta: '/comprador/pedidos',
      icono: { tipo: 'propio', nombre: 'mis-pedidos' },
    },
    {
      etiqueta: 'Mis vehículos',
      ruta: '/comprador/vehiculos',
      icono: { tipo: 'propio', nombre: 'mis-vehiculos' },
    },
  ],
  PROVEEDOR: [
    {
      etiqueta: 'Perfil comercial',
      ruta: '/proveedor/perfil',
      icono: { tipo: 'material', nombre: 'storefront' },
    },
    {
      etiqueta: 'Solicitudes abiertas',
      ruta: '/proveedor/solicitudes',
      icono: { tipo: 'material', nombre: 'list_alt' },
    },
    {
      etiqueta: 'Mis ofertas',
      ruta: '/proveedor/ofertas',
      icono: { tipo: 'material', nombre: 'local_offer' },
    },
    {
      etiqueta: 'Mis pedidos',
      ruta: '/proveedor/pedidos',
      icono: { tipo: 'propio', nombre: 'mis-pedidos' },
    },
  ],
  ADMIN: [
    {
      etiqueta: 'Proveedores pendientes',
      ruta: '/admin/proveedores',
      icono: { tipo: 'material', nombre: 'how_to_reg' },
    },
    {
      etiqueta: 'Categorías',
      ruta: '/admin/categorias',
      icono: { tipo: 'material', nombre: 'category' },
    },
  ],
};

/** Nombre amable del rol para el toolbar. */
export const NOMBRE_ROL: Record<Rol, string> = {
  COMPRADOR: 'Comprador',
  PROVEEDOR: 'Proveedor',
  ADMIN: 'Administrador',
};
