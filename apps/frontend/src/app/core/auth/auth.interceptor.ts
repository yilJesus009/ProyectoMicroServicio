import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthFacade } from '../../facades/auth.facade';

/**
 * Rutas públicas. Un 401 aquí significa "credenciales incorrectas" (un dato
 * mal escrito), NO "tu sesión venció": cerrar la sesión en ese caso mandaría
 * a la persona al login en bucle sin poder corregir su contraseña.
 */
const RUTAS_PUBLICAS = ['/auth/login', '/auth/register'];

/**
 * Interceptor JWT (docs/frontend.md → "Seguridad en el cliente"):
 *
 * 1. Agrega `Authorization: Bearer <token>` a todo lo que no sea público.
 * 2. Si el backend responde 401 en una ruta protegida, cierra la sesión
 *    (AuthFacade limpia localStorage y navega a /login).
 *
 * El token lo sigue validando cada servicio por su cuenta (AGENTS.md §4.5);
 * esto solo evita mandar peticiones que ya sabemos que van a fallar.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const facade = inject(AuthFacade);

  const esPublica = RUTAS_PUBLICAS.some((ruta) => req.url.endsWith(ruta));
  const token = facade.sesion()?.token;

  const peticion =
    token && !esPublica
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !esPublica) {
        facade.cerrarSesion();
      }
      return throwError(() => error);
    }),
  );
};
