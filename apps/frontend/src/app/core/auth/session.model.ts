/**
 * Contratos de sesión y usuario tal como los devuelve la API.
 *
 * Todo endpoint responde con el sobre { status, msg, data } (AGENTS.md §8),
 * así que Envelope<T> es el tipo de todas las respuestas. La única excepción
 * es POST /auth/verify, que responde en plano y todavía no consume el
 * frontend.
 */

/** Los tres roles del marketplace (packages/shared/src/enums/roles.js). */
export type Rol = 'COMPRADOR' | 'PROVEEDOR' | 'ADMIN';

/** Usuario tal como lo devuelve GET /auth/me y POST /auth/login. */
export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  ciudad: string | null;
  rol: Rol;
}

/** Lo que queda guardado en el navegador mientras la sesión esté viva. */
export interface Sesion {
  token: string;
  /** Segundos de vida del token (`expires_in` de POST /auth/login). */
  expiraEn: number;
  usuario: Usuario;
}

/** Body de POST /auth/login. */
export interface Credenciales {
  email: string;
  contrasena: string;
}

/** Body de POST /auth/register. `rol` solo admite los dos roles públicos. */
export interface Registro {
  nombre: string;
  email: string;
  contrasena: string;
  telefono?: string;
  ciudad?: string;
  rol: Exclude<Rol, 'ADMIN'>;
}

/** Sobre estándar de respuesta. */
export interface Envelope<T> {
  status: number;
  msg: string;
  data: T;
}

/**
 * Panel al que entra cada rol después de iniciar sesión.
 * Lo usan el login, el registro y los guards.
 */
export const PANEL: Record<Rol, string> = {
  COMPRADOR: '/comprador/solicitudes',
  PROVEEDOR: '/proveedor/solicitudes',
  ADMIN: '/admin/proveedores',
};
