import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { Envelope } from '../core/auth/session.model';

/** Categoría de Catálogo (GET /categories y /admin/categories). */
export interface Categoria {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  active: boolean;
}

/** Vehículo del comprador (GET /vehicles/mine). */
export interface Vehiculo {
  id: number;
  brand: string;
  model: string;
  year: number;
  plate: string | null;
}

export interface DatosCategoria {
  name: string;
  description?: string;
  icon?: string;
}

export interface DatosVehiculo {
  brand: string;
  model: string;
  year: number;
  plate?: string;
}

/**
 * Fachada de Catálogo: categorías (público/admin) y vehículos del
 * comprador (docs/contratos-api.md → Catálogo).
 */
@Injectable({ providedIn: 'root' })
export class CatalogoFacade {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  /** GET /categories — solo las activas (para elegir al publicar). */
  async categoriasActivas(): Promise<Categoria[]> {
    const respuesta = await firstValueFrom(
      this.http.get<Envelope<Categoria[]>>(`${this.url}/categories`),
    );
    return respuesta.data;
  }

  /** GET /admin/categories — todas, incluidas las inactivas. */
  async categoriasTodas(): Promise<Categoria[]> {
    const respuesta = await firstValueFrom(
      this.http.get<Envelope<Categoria[]>>(`${this.url}/admin/categories`),
    );
    return respuesta.data;
  }

  /** POST /admin/categories — crea (name, description, icon). */
  async crearCategoria(datos: DatosCategoria): Promise<Categoria> {
    const respuesta = await firstValueFrom(
      this.http.post<Envelope<Categoria>>(`${this.url}/admin/categories`, datos),
    );
    return respuesta.data;
  }

  /** PUT /admin/categories/{id} — edita. */
  async editarCategoria(id: number, datos: DatosCategoria): Promise<Categoria> {
    const respuesta = await firstValueFrom(
      this.http.put<Envelope<Categoria>>(`${this.url}/admin/categories/${id}`, datos),
    );
    return respuesta.data;
  }

  /** PATCH /admin/categories/{id}/toggle — activa o desactiva (no se borra). */
  async alternarCategoria(id: number): Promise<Categoria> {
    const respuesta = await firstValueFrom(
      this.http.patch<Envelope<Categoria>>(`${this.url}/admin/categories/${id}/toggle`, {}),
    );
    return respuesta.data;
  }

  /** GET /vehicles/mine — vehículos del comprador. */
  async misVehiculos(): Promise<Vehiculo[]> {
    const respuesta = await firstValueFrom(
      this.http.get<Envelope<Vehiculo[]>>(`${this.url}/vehicles/mine`),
    );
    return respuesta.data;
  }

  /** POST /vehicles — registra uno (201). */
  async crearVehiculo(datos: DatosVehiculo): Promise<Vehiculo> {
    const respuesta = await firstValueFrom(
      this.http.post<Envelope<Vehiculo>>(`${this.url}/vehicles`, datos),
    );
    return respuesta.data;
  }

  /** DELETE /vehicles/{id} — elimina (el dueño, si lo es). */
  async borrarVehiculo(id: number): Promise<void> {
    await firstValueFrom(
      this.http.delete<Envelope<null>>(`${this.url}/vehicles/${id}`),
    );
  }
}
