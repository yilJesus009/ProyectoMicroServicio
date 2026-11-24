import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';

import { EntradaHistorial, EstadoPedido, TipoEntregaPedido } from '../../facades/pedidos.facade';
import { ETIQUETA_ESTADO_PEDIDO } from '../order-card/order-card.component';

/** Un paso fijo del seguimiento (sección 9 de DISEÑO.md), ya resuelto con los datos reales. */
interface Paso {
  readonly estado: EstadoPedido;
  readonly etiqueta: string;
  readonly completado: boolean;
  readonly actual: boolean;
  readonly fecha: string | null;
}

/**
 * Línea de tiempo de un pedido (dumb), como pide la sección 9 de
 * DISEÑO.md: 4 pasos fijos (Pendiente de pago → Preparando → En camino o
 * Listo para retiro, según la entrega → Entregado), no el historial crudo.
 *
 * El tercer paso depende de `deliveryType`; un pedido con `status` que no
 * cae en ninguno de los 4 pasos (por ahora solo `COMPLETED`, que pasa
 * DESPUÉS de "Entregado") no rompe el componente: todos los pasos
 * alcanzados quedan completados y el estado real se muestra aparte, en
 * tono neutro.
 */
@Component({
  selector: 'app-order-timeline',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="pasos">
      @for (paso of pasos(); track paso.estado) {
        <li
          class="paso"
          [class.paso--completado]="paso.completado && !paso.actual"
          [class.paso--actual]="paso.actual"
        >
          <span class="paso__punto" aria-hidden="true"></span>
          <span class="paso__etiqueta">{{ paso.etiqueta }}</span>
          @if (paso.fecha; as fecha) {
            <time class="paso__fecha" [attr.datetime]="fecha">{{ fecha | date: 'dd/MM/yyyy' }}</time>
          }
        </li>
      }
    </ol>

    @if (estadoFueraDePasos(); as etiqueta) {
      <p class="fuera-de-pasos texto-sm">
        Estado actual: <span class="estado estado--neutro">{{ etiqueta }}</span>
      </p>
    }
  `,
  styles: `
    .fuera-de-pasos {
      margin: var(--esp-3) 0 0;
      color: var(--color-tinta-suave);
    }
  `,
})
export class OrderTimelineComponent {
  /** Estado actual del pedido (obligatorio). */
  readonly status = input.required<EstadoPedido>();

  /** Tipo de entrega: decide si el tercer paso es "En camino" o "Listo para retiro". */
  readonly deliveryType = input.required<TipoEntregaPedido>();

  /** Historial de transiciones, para sacar la fecha de cada paso alcanzado. */
  readonly history = input.required<EntradaHistorial[]>();

  /** Los 4 pasos fijos de la sección 9, ya resueltos contra el pedido real. */
  readonly pasos = computed<Paso[]>(() => {
    const tercerPaso: EstadoPedido =
      this.deliveryType() === 'PICKUP' ? 'READY_FOR_PICKUP' : 'IN_TRANSIT';
    const secuencia: EstadoPedido[] = ['PENDING_PAYMENT', 'PREPARING', tercerPaso, 'DELIVERED'];
    const historial = this.history();
    const actual = this.status();

    return secuencia.map((estado) => {
      const entrada = historial.find((h) => h.to_status === estado);
      return {
        estado,
        etiqueta: ETIQUETA_ESTADO_PEDIDO[estado] ?? estado,
        completado: entrada !== undefined,
        actual: estado === actual,
        fecha: entrada?.changed_at ?? null,
      };
    });
  });

  /**
   * Etiqueta del estado real cuando no coincide con ninguno de los 4 pasos
   * (hoy, solo `COMPLETED`); null si el estado actual sí es uno de los pasos.
   */
  readonly estadoFueraDePasos = computed<string | null>(() => {
    const actual = this.status();
    const esUnoDeLosPasos = this.pasos().some((paso) => paso.estado === actual);
    return esUnoDeLosPasos ? null : (ETIQUETA_ESTADO_PEDIDO[actual] ?? actual);
  });
}
