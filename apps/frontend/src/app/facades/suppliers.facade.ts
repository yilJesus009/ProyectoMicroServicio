import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { Envelope } from '../core/auth/session.model';

/** Estado del perfil comercial (docs/modelo-datos.md). */
export type EstadoPerfil = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Perfil comercial tal como lo devuelve la API (Identidad). */
export interface PerfilProveedor {
  id: number;
  user_id: number;
  business_name: string;
  city: string;
  phone: string;
  category_ids: number[];
  status: EstadoPerfil;
  rejection_reason: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Body de PUT /suppliers/me (los cuatro campos del contrato). */
export interface PerfilParaGuardar {
  business_name: string;
  city: string;
  phone: string;
  category_ids: number[];
}

/**
 * Fachada de proveedores: la ÚNICA puerta entre las pantallas y
 * `/suppliers/me` + `/admin/suppliers` (docs/contratos-api.md → Identidad).
 */
@Injectable({ providedIn: 'root' })
export class SuppliersFacade {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/suppliers`;
  private readonly adminUrl = `${environment.apiUrl}/admin/suppliers`;

  /**
   * GET /suppliers/me — el perfil propio, o `null` si aún no existe.
   * El contrato dice 404 sin perfil; para las pantallas eso es "sin datos",
   * no un error, así que el 404 se traduce en null.
   */
  async miPerfil(): Promise<PerfilProveedor | null> {
    try {
      const respuesta = await firstValueFrom(
        this.http.get<Envelope<PerfilProveedor>>(`${this.url}/me`),
      );
      return respuesta.data;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) return null;
      throw err;
    }
  }

  /**
   * PUT /suppliers/me — crea o actualiza el perfil. Siempre vuelve
   * `PENDING` (contrato): quien cambia datos vuelve a pasar revisión.
   */
  async guardarPerfil(datos: PerfilParaGuardar): Promise<PerfilProveedor> {
    const respuesta = await firstValueFrom(
      this.http.put<Envelope<PerfilProveedor>>(`${this.url}/me`, datos),
    );
    return respuesta.data;
  }

  /** GET /admin/suppliers[?status=…] — perfiles, opcionalmente filtrados. */
  async listar(status?: EstadoPerfil): Promise<PerfilProveedor[]> {
    const respuesta = await firstValueFrom(
      this.http.get<Envelope<PerfilProveedor[]>>(
        status ? `${this.adminUrl}?status=${status}` : this.adminUrl,
      ),
    );
    return respuesta.data;
  }

  /** POST /admin/suppliers/{id}/approve → SUPPLIER_APPROVED. */
  async aprobar(id: number): Promise<PerfilProveedor> {
    const respuesta = await firstValueFrom(
      this.http.post<Envelope<PerfilProveedor>>(`${this.adminUrl}/${id}/approve`, {}),
    );
    return respuesta.data;
  }

  /** POST /admin/suppliers/{id}/reject (body: reason) → SUPPLIER_REJECTED. */
  async rechazar(id: number, motivo: string): Promise<PerfilProveedor> {
    const respuesta = await firstValueFrom(
      this.http.post<Envelope<PerfilProveedor>>(`${this.adminUrl}/${id}/reject`, {
        reason: motivo,
      }),
    );
    return respuesta.data;
  }
}
