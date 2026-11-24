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
  imports: [DatePipe, DecimalPipe, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="panel pedido">
      <header class="cabecera">
        <h3 class="texto-lg">{{ pedido().part_description }}</h3>
        <span class="estado" [class]="'estado--' + (TONO_ESTADO[pedido().status] ?? 'neutro')">
          {{ ETIQUETA_ESTADO[pedido().status] ?? pedido().status }}
        </span>
      </header>

      <p class="proveedor texto-sm">{{ pedido().supplier_name }}</p>

      <p class="precio num">
        {{ pedido().price | number: '1.2-2' }} <span>{{ pedido().currency }}</span>
      </p>

      <div class="datos">
        <span class="dato">{{ pedido().vehicle_label || 'Vehículo no especificado' }}</span>
        <span class="dato">{{ ETIQUETA_ENTREGA[pedido().delivery_type] ?? pedido().delivery_type }}</span>
        <span class="dato">{{ pedido().estimated_days }} día(s)</span>
        <time class="dato fecha num" [attr.datetime]="pedido().created_at">
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
      display: flex;
      flex-direction: column;
      gap: var(--esp-2);
    }
    .cabecera {
      display: flex;
      justify-content: space-between;
      gap: var(--esp-4);
      align-items: start;
    }
    h3 {
      margin: 0;
    }
    .proveedor {
      margin: 0;
      color: var(--color-tinta-suave);
    }
    .precio {
      margin: 0;
      font-size: var(--texto-xl);
      font-weight: 700;
      color: var(--color-tinta);
    }
    .precio span {
      font-size: var(--texto-sm);
      font-weight: 400;
      color: var(--color-tinta-suave);
    }
    .datos {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
    }
    .dato {
      font-size: var(--texto-xs);
      color: var(--color-tinta-suave);
      background: var(--color-superficie-2);
      border-radius: var(--radio-control);
      padding: 2px var(--esp-2);
    }
    .accion {
      margin-top: var(--esp-2);
      align-self: flex-start;
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
