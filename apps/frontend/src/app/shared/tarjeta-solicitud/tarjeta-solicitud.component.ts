import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';

import { Solicitud } from '../../facades/solicitudes.facade';

/** Textos en español de los estados (docs/frontend.md → "Estados en pantalla"). */
const ETIQUETA_ESTADO: Record<string, string | undefined> = {
  PUBLISHED: 'Publicada',
  RECEIVING_OFFERS: 'Recibiendo ofertas',
  OFFER_ACCEPTED: 'Oferta aceptada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const ETIQUETA_URGENCIA: Record<string, string | undefined> = {
  BAJA: 'Urgencia baja',
  MEDIA: 'Urgencia media',
  ALTA: 'Urgencia alta',
};

/**
 * Tarjeta de una solicitud (dumb): la usan las solicitudes abiertas del
 * proveedor (M2.1) y "Mis solicitudes" del comprador (M2.3).
 *
 * Presentación pura: recibe la solicitud por input, no toca la API.
 */
@Component({
  selector: 'app-tarjeta-solicitud',
  imports: [DatePipe, MatChipsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="tarjeta">
      <header class="cabecera">
        <h3>{{ solicitud().description }}</h3>
        <span class="estado" [class]="'estado-' + solicitud().status">
          {{ ETIQUETA_ESTADO[solicitud().status] ?? solicitud().status }}
        </span>
      </header>

      <p class="vehiculo">{{ vehiculo() }}</p>

      <div class="datos">
        @if (solicitud().category_name; as categoria) {
          <span class="dato">{{ categoria }}</span>
        }
        <span class="dato">{{ solicitud().city }}</span>
        <span class="dato urgencia">
          {{ ETIQUETA_URGENCIA[solicitud().urgency] ?? solicitud().urgency }}
        </span>
        <time class="dato fecha" [attr.datetime]="solicitud().created_at">
          {{ solicitud().created_at | date: 'dd/MM/yyyy' }}
        </time>
      </div>
    </article>
  `,
  styles: `
    .tarjeta {
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
    .estado-PUBLISHED,
    .estado-RECEIVING_OFFERS {
      background: #fff3cd;
      color: #8a6d00;
    }
    .estado-OFFER_ACCEPTED {
      background: #d6e9ff;
      color: #0b5394;
    }
    .estado-COMPLETED {
      background: #d4edda;
      color: #1e6b34;
    }
    .estado-CANCELLED {
      background: #f8d7da;
      color: #842029;
    }
    .vehiculo {
      margin: 0.35rem 0;
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
    .urgencia {
      background: #ffe0b2;
    }
  `,
})
export class TarjetaSolicitudComponent {
  /** La solicitud a mostrar (obligatoria). */
  readonly solicitud = input.required<Solicitud>();

  /** "Toyota Corolla 2018", o la descripción del vehículo si viniera por partes. */
  readonly vehiculo = computed(() => {
    const s = this.solicitud();
    if (s.vehicle_label) return s.vehicle_label;
    if (s.vehicle_brand) {
      return [s.vehicle_brand, s.vehicle_model, s.vehicle_year].filter(Boolean).join(' ');
    }
    return 'Vehículo no especificado';
  });

  protected readonly ETIQUETA_ESTADO = ETIQUETA_ESTADO;
  protected readonly ETIQUETA_URGENCIA = ETIQUETA_URGENCIA;
}
