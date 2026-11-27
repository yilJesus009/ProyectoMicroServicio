import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { mensajeDeError } from '../../../core/error/api-error';
import { EstadoPedido, Pedido, PedidosFacade } from '../../../facades/pedidos.facade';
import {
  ETIQUETA_ESTADO_PEDIDO,
  OrderCardComponent,
} from '../../../shared/order-card/order-card.component';

/** Siguiente acción según estado y tipo de entrega (docs/flujo-principal.md). */
function siguienteEstado(pedido: Pedido): { estado: EstadoPedido; etiqueta: string } | null {
  if (pedido.status === 'PREPARING') {
    return pedido.delivery_type === 'DELIVERY'
      ? { estado: 'IN_TRANSIT', etiqueta: 'Marcar en camino' }
      : { estado: 'READY_FOR_PICKUP', etiqueta: 'Marcar listo para retiro' };
  }
  if (pedido.status === 'IN_TRANSIT' || pedido.status === 'READY_FOR_PICKUP') {
    return { estado: 'DELIVERED', etiqueta: 'Marcar entregado' };
  }
  // PENDING_PAYMENT (espera del comprador) y COMPLETED: sin acción.
  return null;
}

/**
 * `/proveedor/pedidos` (docs/frontend.md): mis pedidos con el botón del
 * siguiente estado según entrega o retiro —
 * PREPARING → IN_TRANSIT (DELIVERY) o READY_FOR_PICKUP (PICKUP) → DELIVERED.
 *
 * El frontend solo refleja la regla: qué transición corresponde la decide
 * este mapa; si el backend la rechaza (422/403) se muestra SU `msg`.
 */
@Component({
  selector: 'app-pedidos-proveedor',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, OrderCardComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pedidos-proveedor.component.html',
  styleUrl: './pedidos-proveedor.component.scss',
})
export class PedidosProveedorComponent {
  private readonly pedidos = inject(PedidosFacade);

  readonly lista = signal<Pedido[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  /** Id del pedido que se está actualizando (para deshabilitar su botón). */
  readonly avanzando = signal<number | null>(null);

  readonly siguienteEstado = siguienteEstado;

  /** "1 pedido" / "4 pedidos" (singular y plural). */
  readonly contador = computed(() => {
    const n = this.lista().length;
    return n === 1 ? '1 pedido' : `${n} pedidos`;
  });

  /** Etiqueta del botón para esa tarjeta; null si no aplica o si ya avanza. */
  accionDe(pedido: Pedido): string | null {
    if (this.avanzando() === pedido.id) return null;
    return siguienteEstado(pedido)?.etiqueta ?? null;
  }

  constructor() {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      this.lista.set(await this.pedidos.delProveedor());
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  /** PATCH /orders/{id}/status con la transición que corresponde. */
  async avanzar(pedido: Pedido): Promise<void> {
    const accion = siguienteEstado(pedido);
    if (!accion) return;

    this.avanzando.set(pedido.id);
    this.error.set(null);
    this.aviso.set(null);
    try {
      const actualizado = await this.pedidos.cambiarEstado(pedido.id, accion.estado);
      this.lista.set(this.lista().map((p) => (p.id === actualizado.id ? actualizado : p)));
      const etiquetaEstado = (ETIQUETA_ESTADO_PEDIDO[accion.estado] ?? accion.estado).toLowerCase();
      this.aviso.set(`Pedido #${pedido.id}: ahora está ${etiquetaEstado}.`);
    } catch (err) {
      // 422 (transición inválida) o 403 (no es su pedido): msg del backend.
      this.error.set(mensajeDeError(err));
    } finally {
      this.avanzando.set(null);
    }
  }
}
