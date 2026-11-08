import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  Credenciales,
  Envelope,
  PANEL,
  Registro,
  Rol,
  Sesion,
  Usuario,
} from '../core/auth/session.model';

/**
 * Claves de almacenamiento local. El token vive en el navegador: sin él no
 * hay forma de llamar al Gateway, y al cerrar el navegador se borra solo.
 */
const CLAVE_TOKEN = 'repuestosya_token';
const CLAVE_USUARIO = 'repuestosya_usuario';

/** Usuario leído del almacenamiento local, o null si no está o está roto. */
function leerUsuario(): Usuario | null {
  try {
    const crudo = localStorage.getItem(CLAVE_USUARIO);
    if (!crudo) return null;
    const usuario = JSON.parse(crudo) as Usuario;
    return usuario && typeof usuario.rol === 'string' ? usuario : null;
  } catch {
    return null;
  }
}

/**
 * Restaura la sesión guardada al recargar la página.
 *
 * Si el token ya venció, el primer401 lo cierra el interceptor: no hace
 * falta consultarlo al arrancar.
 */
function leerSesion(): Sesion | null {
  const token = localStorage.getItem(CLAVE_TOKEN);
  const usuario = leerUsuario();
  return token && usuario ? { token, expiraEn: 0, usuario } : null;
}

/**
 * Fachada de autenticación: la ÚNICA puerta entre las pantallas y
 * `POST /auth/*` (docs/frontend.md → `facades/`).
 *
 * Además conserva la sesión en una signal, de forma que el menú, el toolbar
 * y los guards se repintan solos cuando cambia.
 */
@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly url = `${environment.apiUrl}/auth`;

  /** Sesión actual, o null. Se lee al arrancar desde localStorage. */
  readonly sesion = signal<Sesion | null>(leerSesion());
  readonly usuario = computed<Usuario | null>(() => this.sesion()?.usuario ?? null);
  readonly rol = computed<Rol | null>(() => this.usuario()?.rol ?? null);
  readonly autenticado = computed<boolean>(() => this.sesion() !== null);

  /**
   * POST /auth/login → guarda token + usuario y devuelve el usuario.
   * Un401 (credenciales malas) se propaga sin cambiar la sesión.
   */
  async login(credenciales: Credenciales): Promise<Usuario> {
    const respuesta = await firstValueFrom(
      this.http.post<Envelope<{ token: string; expires_in: number; usuario: Usuario }>>(
        `${this.url}/login`,
        credenciales,
      ),
    );

    const { token, expires_in: expiraEn, usuario } = respuesta.data;

    localStorage.setItem(CLAVE_TOKEN, token);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
    this.sesion.set({ token, expiraEn, usuario });

    return usuario;
  }

  /**
   * POST /auth/register → devuelve el usuario creado.
   *
   * OJO: la Identidad NO emite token en el registro (201 con el usuario
   * listo), así que quien quiera entrar tiene que hacer login después.
   */
  async registro(datos: Registro): Promise<Usuario> {
    const respuesta = await firstValueFrom(
      this.http.post<Envelope<Usuario>>(`${this.url}/register`, datos),
    );
    return respuesta.data;
  }

  /** Registro + login en un solo movimiento, que es lo que quiere la pantalla. */
  async registroYEntrar(datos: Registro): Promise<Usuario> {
    await this.registro(datos);
    return this.login({ email: datos.email, contrasena: datos.contrasena });
  }

  /** Cierra la sesión y vuelve al login. Lo usa el botón "Salir" y el interceptor. */
  cerrarSesion(): void {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    this.sesion.set(null);
    void this.router.navigate(['/login']);
  }

  /** Panel del rol de la persona que inició sesión. */
  panel(): string {
    const rol = this.rol();
    return rol ? PANEL[rol] : '/login';
  }
}
