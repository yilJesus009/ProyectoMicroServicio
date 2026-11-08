import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { Envelope } from '../core/auth/session.model';

/** Estados de solicitud (packages/shared → PartRequestStatus). */
export type EstadoSolicitud =
  | 'PUBLISHED'
  | 'RECEIVING_OFFERS'
  | 'OFFER_ACCEPTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type Urgencia = 'BAJA' | 'MEDIA' | 'ALTA';

/** Solicitud de repuesto tal como la devuelve Negociación (snake_case). */
export interface Solicitud {
  id: number;
  user_id: number;
  category_id?: number;
  category_name?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_label?: string;
  description: string;
  city: string;
  urgency: Urgencia;
  status: EstadoSolicitud;
  photo?: string | null;
  created_at: string;
  updated_at?: string;
}

/** Filtros de GET /part-requests/open. */
export interface FiltroAbiertas {
  city?: string;
  category_id?: number;
}

/**
 * Fachada de solicitudes (docs/contratos-api.md → Negociación).
 *
 * El POST es multipart (acepta foto): el body va como FormData y el
 * navegador pone el Content-Type él solo.
 */
@Injectable({ providedIn: 'root' })
export class SolicitudesFacade {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/part-requests`;

  /** GET /part-requests/open?city=&category_id= — las que ven los proveedores. */
  async abiertas(filtro: FiltroAbiertas = {}): Promise<Solicitud[]> {
    let params = new HttpParams();
    if (filtro.city) params = params.set('city', filtro.city);
    if (filtro.category_id !== undefined) params = params.set('category_id', filtro.category_id);

    const respuesta = await firstValueFrom(
      this.http.get<Envelope<Solicitud[]>>(`${this.url}/open`, { params }),
    );
    return respuesta.data;
  }

  /** GET /part-requests/mine — las que publicó el comprador. */
  async mias(): Promise<Solicitud[]> {
    const respuesta = await firstValueFrom(
      this.http.get<Envelope<Solicitud[]>>(`${this.url}/mine`),
    );
    return respuesta.data;
  }

  /** POST /part-requests (multipart) — crea la solicitud con su foto. */
  async crear(datos: FormData): Promise<Solicitud> {
    const respuesta = await firstValueFrom(
      this.http.post<Envelope<Solicitud>>(this.url, datos),
    );
    return respuesta.data;
  }
}
