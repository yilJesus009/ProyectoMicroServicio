import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

import { Oferta } from '../../facades/solicitudes.facade';

/** Textos en español de los estados de oferta (docs/frontend.md). */
const ETIQUETA_ESTADO: Record<string, string | undefined> = {
  SUBMITTED: 'Enviada',
  ACCEPTED: 'Aceptada',
  REJECTED: 'No elegida',
  WITHDRAWN: 'Retirada',
};

const ETIQUETA_CONDICION: Record<string, string | undefined> = {
  NEW: 'Nuevo',
  USED: 'Usado',
  REFURBISHED: 'Reacondicionado',
};

const ETIQUETA_DISPONIBILIDAD: Record<string, string | undefined> = {
  IN_STOCK: 'En stock',
  ON_ORDER: 'Por encargo',
};

const ETIQUETA_ENTREGA: Record<string, string | undefined> = {
  DELIVERY: 'Entrega a domicilio',
  PICKUP: 'Retiro en tienda',
};

/**
 * Tarjeta de una oferta (dumb): la usan el comparador del comprador
 * (botón "Aceptar") y "Mis ofertas" del proveedor (botón "Retirar").
 *
 * Presentación pura: recibe la oferta por input y avisa con output; no toca
 * la API ni decide reglas (docs/frontend.md → patrón smart/dumb).
 */
@Component({
  selector: 'app-offer-card',
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatChipsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="oferta" [class.estado-aceptada]="oferta().status === 'ACCEPTED'">
      <header class="cabecera">
        <h3>{{ oferta().supplier_name }}</h3>
        <span class="estado" [class]="'estado-' + oferta().status">
          {{ ETIQUETA_ESTADO[oferta().status] ?? oferta().status }}
        </span>
      </header>

      <p class="precio">
        {{ oferta().price | number: '1.2-2' }} <span>{{ oferta().currency }}</span>
      </p>

      <div class="datos">
        <span class="dato">{{ oferta().brand }}</span>
        <span class="dato">{{ ETIQUETA_CONDICION[oferta().condition] ?? oferta().condition }}</span>
        <span class="dato">
          {{ ETIQUETA_DISPONIBILIDAD[oferta().availability] ?? oferta().availability }}
        </span>
        <span class="dato">{{ ETIQUETA_ENTREGA[oferta().delivery_type] ?? oferta().delivery_type }}</span>
        <span class="dato">{{ oferta().estimated_days }} día(s)</span>
        <time class="dato fecha" [attr.datetime]="oferta().created_at">
          {{ oferta().created_at | date: 'dd/MM/yyyy' }}
        </time>
      </div>

      @if (oferta().notes; as notas) {
        <p class="notas">{{ notas }}</p>
      }

      @if (accion(); as etiqueta) {
        <button
          mat-flat-button
          class="accion"
          [color]="esAceptar() ? 'primary' : 'warn'"
          (click)="accionEmitida.emit()"
        >
          {{ etiqueta }}
        </button>
      }
    </article>
  `,
  styles: `
    .oferta {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 0.9rem 1rem;
      background: #fff;
    }
    .oferta.estado-aceptada {
      border-color: #1e6b34;
      background: #f3faf5;
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
    .estado-SUBMITTED {
      background: #fff3cd;
      color: #8a6d00;
    }
    .estado-ACCEPTED {
      background: #d4edda;
      color: #1e6b34;
    }
    .estado-REJECTED {
      background: #f8d7da;
      color: #842029;
    }
    .estado-WITHDRAWN {
      background: #e0e0e0;
      color: #546e7a;
    }
    .precio {
      margin: 0.5rem 0;
      font-size: 1.4rem;
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
    .notas {
      margin: 0.6rem 0 0;
      font-size: 0.85rem;
      color: #546e7a;
    }
    .accion {
      margin-top: 0.8rem;
    }
  `,
})
export class OfferCardComponent {
  /** La oferta a mostrar (obligatoria). */
  readonly oferta = input.required<Oferta>();

  /**
   * Etiqueta del botón. `null` (por defecto) no muestra botón: el comparador
   * pone "Aceptar oferta" y "Mis ofertas" pone "Retirar oferta".
   */
  readonly accion = input<string | null>(null);

  /** Si el botón es de aceptar (color primario) o de retirar (alerta). */
  readonly esAceptar = input(false);

  /** Aviso al smart de que se pulsó la acción. */
  readonly accionEmitida = output<void>();

  readonly ETIQUETA_ESTADO = ETIQUETA_ESTADO;
  readonly ETIQUETA_CONDICION = ETIQUETA_CONDICION;
  readonly ETIQUETA_DISPONIBILIDAD = ETIQUETA_DISPONIBILIDAD;
  readonly ETIQUETA_ENTREGA = ETIQUETA_ENTREGA;
}
