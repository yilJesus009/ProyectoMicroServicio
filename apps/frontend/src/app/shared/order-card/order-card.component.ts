import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Pedido } from '../../facades/pedidos.facade';
import { MonedaPipe } from '../moneda.pipe';

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

/** Tono de DISEÑO.md (sección 10) para cada estado real del pedido. */
export const TONO_ESTADO_PEDIDO: Record<string, string | undefined> = {
  PENDING_PAYMENT: 'info',
  PREPARING: 'info',
  IN_TRANSIT: 'info',
  READY_FOR_PICKUP: 'info',
  DELIVERED: 'exito',
  COMPLETED: 'exito',
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
  imports: [DatePipe, MatButtonModule, MatIconModule, MonedaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="fila">
      <div class="fila__icono">
        <mat-icon aria-hidden="true">local_shipping</mat-icon>
      </div>

      <div class="fila__contenido">
        <p class="fila__categoria texto-xs">{{ pedido().supplier_name }}</p>
        <h3 class="fila__titulo">{{ pedido().part_description }}</h3>
        <div class="fila__meta">
          <span>
            <mat-icon aria-hidden="true">directions_car</mat-icon>
            {{ pedido().vehicle_label || 'Vehículo no especificado' }}
          </span>
          <span>
            <mat-icon aria-hidden="true">local_shipping</mat-icon>
            {{ ETIQUETA_ENTREGA[pedido().delivery_type] ?? pedido().delivery_type }}, {{ pedido().estimated_days }} día(s)
          </span>
          <span>
            <mat-icon aria-hidden="true">schedule</mat-icon>
            <time class="num" [attr.datetime]="pedido().created_at">
              {{ pedido().created_at | date: 'dd/MM/yyyy' }}
            </time>
          </span>
        </div>
      </div>

      <p class="fila__precio num">{{ pedido().price | moneda: pedido().currency }}</p>

      <div class="fila__estados">
        <span class="estado" [class]="'estado--' + (TONO_ESTADO[pedido().status] ?? 'neutro')">
          {{ ETIQUETA_ESTADO[pedido().status] ?? pedido().status }}
        </span>
      </div>

      @if (accion(); as etiqueta) {
        <div class="fila__accion">
          <button mat-flat-button color="primary" (click)="accionEmitida.emit()">
            {{ etiqueta }}
          </button>
        </div>
      }
    </article>
  `,
  styles: `
    .fila__precio {
      margin: 0;
      flex-shrink: 0;
      font-size: var(--texto-lg);
      font-weight: 700;
      color: var(--color-tinta);
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
  readonly TONO_ESTADO = TONO_ESTADO_PEDIDO;
  readonly ETIQUETA_ENTREGA = ETIQUETA_ENTREGA;
}
