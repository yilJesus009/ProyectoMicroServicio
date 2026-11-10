import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';

import { EntradaHistorial } from '../../facades/pedidos.facade';
import { ETIQUETA_ESTADO_PEDIDO } from '../order-card/order-card.component';

/**
 * Línea de tiempo de los estados de un pedido (dumb),
 * como pide docs/frontend.md para `/comprador/pedidos/:id`.
 *
 * Muestra el historial en orden cronológico y resalta la entrada más
 * reciente (el estado actual).
 */
@Component({
  selector: 'app-order-timeline',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="timeline">
      @for (entrada of historial(); track $index) {
        <li [class.actual]="$last">
          <span class="punto" aria-hidden="true"></span>
          <div class="contenido">
            <span class="estado">{{ ETIQUETA[entrada.to_status] ?? entrada.to_status }}</span>
            <time class="fecha" [attr.datetime]="entrada.changed_at">
              {{ entrada.changed_at | date: 'dd/MM/yyyy HH:mm' }}
            </time>
          </div>
        </li>
      } @empty {
        <li class="vacio">Sin movimientos todavía.</li>
      }
    </ol>
  `,
  styles: `
    .timeline {
      list-style: none;
      margin: 0;
      padding: 0 0 0 1rem;
      border-left: 2px solid #e0e0e0;
    }
    li {
      position: relative;
      padding: 0 0 1rem 1rem;
    }
    .punto {
      position: absolute;
      left: -1.4rem;
      top: 0.2rem;
      width: 0.75rem;
      height: 0.75rem;
      border-radius: 50%;
      background: #b0bec5;
      border: 2px solid #fff;
    }
    li.actual .punto {
      background: #1e6b34;
    }
    li.actual .estado {
      font-weight: 600;
      color: #1e6b34;
    }
    .contenido {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .fecha {
      font-size: 0.8rem;
      color: #546e7a;
    }
    .vacio {
      color: #546e7a;
      font-size: 0.9rem;
    }
  `,
})
export class OrderTimelineComponent {
  /** Historial del pedido en orden del backend (el más reciente al final). */
  readonly historial = input.required<EntradaHistorial[]>();

  readonly ETIQUETA = ETIQUETA_ESTADO_PEDIDO;
}
