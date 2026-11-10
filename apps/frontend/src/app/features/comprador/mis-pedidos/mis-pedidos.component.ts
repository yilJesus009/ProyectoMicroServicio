import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { mensajeDeError } from '../../../core/error/api-error';
import { Pedido, PedidosFacade } from '../../../facades/pedidos.facade';
import { OrderCardComponent } from '../../../shared/order-card/order-card.component';

/**
 * `/comprador/pedidos` (docs/frontend.md): mis pedidos como comprador.
 *
 * Smart mínimo: una sola llamada a `GET /orders/mine`; cada tarjeta es el
 * dumb `OrderCardComponent` y enlaza a su seguimiento.
 */
@Component({
  selector: 'app-mis-pedidos',
  imports: [MatButtonModule, OrderCardComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mis-pedidos.component.html',
  styleUrl: './mis-pedidos.component.scss',
})
export class MisPedidosComponent {
  private readonly pedidos = inject(PedidosFacade);

  readonly lista = signal<Pedido[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      this.lista.set(await this.pedidos.misPedidos());
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargando.set(false);
    }
  }
}
