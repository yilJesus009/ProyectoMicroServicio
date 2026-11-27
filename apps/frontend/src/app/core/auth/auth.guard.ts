import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthFacade } from '../../facades/auth.facade';
import { PANEL, Rol } from './session.model';

/**
 * Guards de ruta (docs/frontend.md → "Guards por rol y redirección al panel
 * de cada rol después del login").
 *
 * El frontend SOLO refleja las reglas: acá no se garantiza nada, la regla
 * vive en el backend. Estos guards evitan mostrar pantallas que van a
 * responder 403 y llevan a cada persona a su propio panel.
 */

/** Deja pasar solo a quien NO tiene sesión (login y registro). */
export const soloPublicoGuard: CanActivateFn = () => {
  const facade = inject(AuthFacade);
  const router = inject(Router);

  if (!facade.autenticado()) return true;

  const rol = facade.rol();
  return router.createUrlTree([rol ? PANEL[rol] : '/login']);
};

/** Exige sesión iniciada para todo el layout. */
export const authGuard: CanActivateFn = () => {
  const facade = inject(AuthFacade);
  const router = inject(Router);

  return facade.autenticado() ? true : router.createUrlTree(['/login']);
};

/**
 * Exige uno de los roles. Si la persona entró con un rol distinto, no la
 * regresa al login (sigue autenticada): la manda al panel de SU rol.
 *
 * Uso: `{ canActivate: [roleGuard('ADMIN')] }`.
 */
export const roleGuard = (...roles: Rol[]): CanActivateFn => {
  return () => {
    const facade = inject(AuthFacade);
    const router = inject(Router);
    const rol = facade.rol();

    if (!rol) return router.createUrlTree(['/login']);
    if (!roles.includes(rol)) return router.createUrlTree([PANEL[rol]]);

    return true;
  };
};
