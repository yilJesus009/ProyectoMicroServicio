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

/** Estados de una oferta (Negociación → OfferStatus). */
export type EstadoOferta = 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export type CondicionOferta = 'NEW' | 'USED' | 'REFURBISHED';
export type Disponibilidad = 'IN_STOCK' | 'ON_ORDER';
export type TipoEntrega = 'DELIVERY' | 'PICKUP';

/** Oferta tal como la devuelve Negociación (snake_case). */
export interface Oferta {
  id: number;
  part_request_id: number;
  supplier_id: number;
  supplier_name: string;
  price: number;
  currency: string;
  brand: string;
  condition: CondicionOferta;
  availability: Disponibilidad;
  delivery_type: TipoEntrega;
  estimated_days: number;
  notes: string | null;
  status: EstadoOferta;
  created_at: string;
  updated_at?: string;
}

/** Body de POST /part-requests/{id}/offers (los campos que valida el DTO). */
export interface DatosOferta {
  price: number;
  brand: string;
  condition: CondicionOferta;
  availability: Disponibilidad;
  delivery_type: TipoEntrega;
  estimated_days: number;
  notes?: string | null;
}

/** Orden del comparador: GET /part-requests/{id}/offers?sort=price|days. */
export type OrdenOfertas = 'price' | 'days';

/** Lo que responde POST /offers/{id}/accept: `{ offer, part_request }`. */
export interface AceptacionDeOferta {
  offer: Oferta;
  part_request: Solicitud;
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
  private readonly off = `${environment.apiUrl}/offers`;

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

  /** GET /part-requests/{id} — detalle (dueño o proveedor aprobado). */
  async detalle(id: number): Promise<Solicitud> {
    const respuesta = await firstValueFrom(
      this.http.get<Envelope<Solicitud>>(`${this.url}/${id}`),
    );
    return respuesta.data;
  }

  /** GET /part-requests/{id}/offers?sort= — comparador, solo el dueño. */
  async ofertas(id: number, sort?: OrdenOfertas): Promise<Oferta[]> {
    let params = new HttpParams();
    if (sort) params = params.set('sort', sort);

    const respuesta = await firstValueFrom(
      this.http.get<Envelope<Oferta[]>>(`${this.url}/${id}/offers`, { params }),
    );
    return respuesta.data;
  }

  /** POST /part-requests/{id}/offers — el proveedor envía su oferta. */
  async enviarOferta(id: number, datos: DatosOferta): Promise<Oferta> {
    const respuesta = await firstValueFrom(
      this.http.post<Envelope<Oferta>>(`${this.url}/${id}/offers`, datos),
    );
    return respuesta.data;
  }

  /** POST /offers/{id}/accept — la operación crítica (dueño de la solicitud). */
  async aceptar(ofertaId: number): Promise<AceptacionDeOferta> {
    const respuesta = await firstValueFrom(
      this.http.post<Envelope<AceptacionDeOferta>>(`${this.off}/${ofertaId}/accept`, {}),
    );
    return respuesta.data;
  }

  /** GET /offers/mine — las ofertas del proveedor con su estado. */
  async misOfertas(): Promise<Oferta[]> {
    const respuesta = await firstValueFrom(
      this.http.get<Envelope<Oferta[]>>(`${this.off}/mine`),
    );
    return respuesta.data;
  }

  /** PATCH /offers/{id}/withdraw — retirar una oferta SUBMITTED. */
  async retirar(ofertaId: number): Promise<Oferta> {
    const respuesta = await firstValueFrom(
      this.http.patch<Envelope<Oferta>>(`${this.off}/${ofertaId}/withdraw`, {}),
    );
    return respuesta.data;
  }
}
