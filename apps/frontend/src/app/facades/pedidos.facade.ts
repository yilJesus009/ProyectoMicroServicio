import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { Envelope } from '../core/auth/session.model';

/** Estados del pedido (Pedidos → OrderStatus, docs/flujo-principal.md). */
export type EstadoPedido =
  | 'PENDING_PAYMENT'
  | 'PREPARING'
  | 'IN_TRANSIT'
  | 'READY_FOR_PICKUP'
  | 'DELIVERED'
  | 'COMPLETED';

/** Métodos de pago simulado (el único dato que viaja al backend). */
export type MetodoPago = 'QR' | 'CARD';

export type TipoEntregaPedido = 'DELIVERY' | 'PICKUP';

/** Entrada del historial de estados que devuelve el pedido. */
export interface EntradaHistorial {
  from_status: string | null;
  to_status: EstadoPedido;
  changed_at: string;
}

/** Pago simulado registrado (solo método y referencia; nunca datos de tarjeta). */
export interface PagoPedido {
  method: MetodoPago;
  reference: string;
  paid_at: string;
}

/** Pedido tal como lo devuelve Pedidos (snake_case, docs/contratos-api.md). */
export interface Pedido {
  id: number;
  offer_id: number;
  part_request_id: number;
  buyer_id: number;
  supplier_id: number;
  supplier_name: string;
  part_description: string;
  vehicle_label: string;
  price: number;
  currency: string;
  delivery_type: TipoEntregaPedido;
  estimated_days: number;
  status: EstadoPedido;
  payment: PagoPedido | null;
  history: EntradaHistorial[];
  created_at: string;
  updated_at?: string;
}

/**
 * Fachada del servicio de Pedidos (Spring Boot).
 *
 * Reglas que aquí se protegen (AGENTS.md §4.6):
 * - El pedido nace solo del evento OFFER_ACCEPTED: no hay método para
 *   crearlo; solo se consulta (`porOferta` durante el polling).
 * - El pago manda SOLO `{ method }`. Ni el número de tarjeta ni el
 *   vencimiento ni el CVV salen jamás del navegador.
 */
@Injectable({ providedIn: 'root' })
export class PedidosFacade {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/orders`;

  /** GET /orders/mine — mis pedidos como comprador. */
  async misPedidos(): Promise<Pedido[]> {
    const respuesta = await firstValueFrom(
      this.http.get<Envelope<Pedido[]>>(`${this.url}/mine`),
    );
    return respuesta.data;
  }

  /** GET /orders/supplier — mis pedidos como proveedor. */
  async delProveedor(): Promise<Pedido[]> {
    const respuesta = await firstValueFrom(
      this.http.get<Envelope<Pedido[]>>(`${this.url}/supplier`),
    );
    return respuesta.data;
  }

  /** GET /orders/{id} — detalle con historial y pago (dueños del pedido). */
  async detalle(id: number): Promise<Pedido> {
    const respuesta = await firstValueFrom(
      this.http.get<Envelope<Pedido>>(`${this.url}/${id}`),
    );
    return respuesta.data;
  }

  /**
   * GET /orders/by-offer/{offerId} — usado por el polling de "Generando tu
   * pedido…". El contrato dice: **404 mientras no exista**, así que devuelve
   * `null` y el llamador reintenta a los 2 s.
   */
  async porOferta(offerId: number): Promise<Pedido | null> {
    try {
      const respuesta = await firstValueFrom(
        this.http.get<Envelope<Pedido>>(`${this.url}/by-offer/${offerId}`),
      );
      return respuesta.data;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) return null;
      throw err;
    }
  }

  /**
   * POST /orders/{id}/payment — pago simulado.
   *
   * Se envía **exclusivamente** `{ method }`; el backend rechaza cualquier
   * campo extra con 400. Los datos de la tarjeta que se ven en pantalla
   * nunca se agregan a este body.
   */
  async pagar(id: number, method: MetodoPago): Promise<Pedido> {
    const respuesta = await firstValueFrom(
      this.http.post<Envelope<Pedido>>(`${this.url}/${id}/payment`, { method }),
    );
    return respuesta.data;
  }

  /** PATCH /orders/{id}/status — el proveedor avanza el estado. */
  async cambiarEstado(id: number, status: EstadoPedido): Promise<Pedido> {
    const respuesta = await firstValueFrom(
      this.http.patch<Envelope<Pedido>>(`${this.url}/${id}/status`, { status }),
    );
    return respuesta.data;
  }

  /** POST /orders/{id}/confirm-receipt — DELIVERED → COMPLETED (dueño). */
  async confirmarRecepcion(id: number): Promise<Pedido> {
    const respuesta = await firstValueFrom(
      this.http.post<Envelope<Pedido>>(`${this.url}/${id}/confirm-receipt`, {}),
    );
    return respuesta.data;
  }
}
