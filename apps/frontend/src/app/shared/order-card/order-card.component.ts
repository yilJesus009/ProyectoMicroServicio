import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

import { Pedido } from '../../facades/pedidos.facade';

/**
 * Textos en español de los estados del pedido
 * (docs/frontend.md → "Estados en pantalla").
 */
export const ETIQUETA_ESTADO_PEDIDO: Record<string, string | undefined> = {
  PENDING_PAYMENT: 'Pendiente de pago',
  PREPARING: 'Preparando',
  IN_TRANSIT: 'En camino',
  READY_FOR_PICKUP: 'Listo para retiro',
  DELIVERED: 'Entregado',
  COMPLETED: 'Completada',
};

const ETIQUETA_ENTREGA: Record<string, string | undefined> = {
  DELIVERY: 'Entrega a domicilio',
  PICKUP: 'Retiro en tienda',
};

/**
 * Tarjeta de un pedido (dumb): la lista del comprador la muestra sin
 * acción; la del proveedor le pasa la etiqueta del siguiente estado
 * ("Marcar en camino", "Marcar entregado"…).
 *
 * Presentación pura: recibe el pedido por input y avisa con output;
 * no toca la API ni decide transiciones (las reglas viven en Pedidos).
 */
@Component({
  selector: 'app-order-card',
  imports: [DatePipe, DecimalPipe, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="pedido">
      <header class="cabecera">
        <h3>{{ pedido().part_description }}</h3>
        <span class="estado">{{ ETIQUETA_ESTADO[pedido().status] ?? pedido().status }}</span>
      </header>

      <p class="proveedor">{{ pedido().supplier_name }}</p>

      <p class="precio">
        {{ pedido().price | number: '1.2-2' }} <span>{{ pedido().currency }}</span>
      </p>

      <div class="datos">
        <span class="dato">{{ pedido().vehicle_label || 'Vehículo no especificado' }}</span>
        <span class="dato">{{ ETIQUETA_ENTREGA[pedido().delivery_type] ?? pedido().delivery_type }}</span>
        <span class="dato">{{ pedido().estimated_days }} día(s)</span>
        <time class="dato fecha" [attr.datetime]="pedido().created_at">
          {{ pedido().created_at | date: 'dd/MM/yyyy' }}
        </time>
      </div>

      @if (accion(); as etiqueta) {
        <button mat-flat-button color="primary" class="accion" (click)="accionEmitida.emit()">
          {{ etiqueta }}
        </button>
      }
    </article>
  `,
  styles: `
    .pedido {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 0.9rem 1rem;
      background: #fff;
    }
    .cabecera {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: start;
    }
    h3 {
      margin: 0;
      font-size: 1rem;
    }
    .estado {
      font-size: 0.75rem;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: #eceff1;
      white-space: nowrap;
    }
    .proveedor {
      margin: 0.25rem 0 0;
      font-size: 0.85rem;
      color: #546e7a;
    }
    .precio {
      margin: 0.5rem 0;
      font-size: 1.3rem;
      font-weight: 600;
      color: #0b5394;
    }
    .precio span {
      font-size: 0.85rem;
      font-weight: 400;
      color: #546e7a;
    }
    .datos {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .dato {
      font-size: 0.8rem;
      background: #f5f5f5;
      border-radius: 4px;
      padding: 0.1rem 0.45rem;
    }
    .accion {
      margin-top: 0.8rem;
    }
  `,
})
export class OrderCardComponent {
  /** El pedido a mostrar (obligatorio). */
  readonly pedido = input.required<Pedido>();

  /** Etiqueta del botón de acción; `null` (por defecto) no muestra botón. */
  readonly accion = input<string | null>(null);

  /** Aviso al smart de que se pulsó la acción. */
  readonly accionEmitida = output<void>();

  readonly ETIQUETA_ESTADO = ETIQUETA_ESTADO_PEDIDO;
  readonly ETIQUETA_ENTREGA = ETIQUETA_ENTREGA;
}
