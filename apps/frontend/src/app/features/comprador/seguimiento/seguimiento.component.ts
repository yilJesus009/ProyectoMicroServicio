import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { mensajeDeError } from '../../../core/error/api-error';
import { Pedido, PedidosFacade } from '../../../facades/pedidos.facade';
import { ETIQUETA_ESTADO_PEDIDO } from '../../../shared/order-card/order-card.component';
import { OrderTimelineComponent } from '../../../shared/order-timeline/order-timeline.component';

/**
 * `/comprador/pedidos/:id` (docs/frontend.md): seguimiento con línea de
 * tiempo de estados y botón "Confirmar recepción" cuando está DELIVERED.
 *
 * Smart: pide `GET /orders/{id}`; el timeline es el dumb
 * `OrderTimelineComponent`. Un 403/422 del backend (rol, transición) se
 * muestra con SU `msg`.
 */
@Component({
  selector: 'app-seguimiento',
  imports: [DecimalPipe, MatButtonModule, MatCardModule, OrderTimelineComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seguimiento.component.html',
  styleUrl: './seguimiento.component.scss',
})
export class SeguimientoComponent {
  private readonly pedidos = inject(PedidosFacade);
  private readonly ruta = inject(ActivatedRoute);

  readonly pedido = signal<Pedido | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly confirmando = signal(false);

  readonly ETIQUETA = ETIQUETA_ESTADO_PEDIDO;

  private readonly id = Number(this.ruta.snapshot.paramMap.get('id'));

  constructor() {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      this.pedido.set(await this.pedidos.detalle(this.id));
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  /** POST /orders/{id}/confirm-receipt — DELIVERED → COMPLETED (dueño). */
  async confirmarRecepcion(): Promise<void> {
    this.confirmando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    try {
      this.pedido.set(await this.pedidos.confirmarRecepcion(this.id));
      this.aviso.set('Recepción confirmada. El pedido y la solicitud quedaron completados.');
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.confirmando.set(false);
    }
  }
}
