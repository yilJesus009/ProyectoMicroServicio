import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

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
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, OrderCardComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mis-pedidos.component.html',
  styleUrl: './mis-pedidos.component.scss',
})
export class MisPedidosComponent {
  private readonly pedidos = inject(PedidosFacade);

  readonly lista = signal<Pedido[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  /** "1 pedido" / "4 pedidos" (singular y plural). */
  readonly contador = computed(() => {
    const n = this.lista().length;
    return n === 1 ? '1 pedido' : `${n} pedidos`;
  });

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
