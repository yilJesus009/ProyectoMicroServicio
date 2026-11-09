import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { Envelope } from '../core/auth/session.model';

/** Aviso dentro de la aplicación (Notificaciones → toResponse). */
export interface Aviso {
  id: number;
  type: string;
  title: string;
  message: string;
  /** Ruta interna; al hacer clic la campanita navega aquí. */
  link: string | null;
  read: boolean;
  created_at: string;
}

/**
 * Fachada de Notificaciones: los cuatro endpoints del contrato
 * (docs/contratos-api.md → Notificaciones).
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesFacade {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/notifications`;

  /** GET /notifications/unread-count → número para la campanita. */
  async sinLeer(): Promise<number> {
    const respuesta = await firstValueFrom(
      this.http.get<Envelope<{ count: number }>>(`${this.url}/unread-count`),
    );
    return respuesta.data.count;
  }

  /** GET /notifications/mine[?unread=true] — avisos del usuario. */
  async avisos(unreadOnly = false): Promise<Aviso[]> {
    const params = unreadOnly ? new HttpParams().set('unread', 'true') : undefined;
    const respuesta = await firstValueFrom(
      this.http.get<Envelope<Aviso[]>>(`${this.url}/mine`, { params }),
    );
    return respuesta.data;
  }

  /** PATCH /notifications/{id}/read — marca UN aviso como leído. */
  async marcarLeida(id: number): Promise<void> {
    await firstValueFrom(
      this.http.patch<Envelope<null>>(`${this.url}/${id}/read`, {}),
    );
  }

  /** PATCH /notifications/read-all — marca TODO como leído. */
  async marcarTodasLeidas(): Promise<void> {
    await firstValueFrom(
      this.http.patch<Envelope<null>>(`${this.url}/read-all`, {}),
    );
  }
}
