import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { Solicitud } from '../../facades/solicitudes.facade';
import { iconoCategoriaPorNombre } from '../iconos-categoria';

/** Textos en español de los estados (docs/frontend.md → "Estados en pantalla"). */
const ETIQUETA_ESTADO: Record<string, string | undefined> = {
  PUBLISHED: 'Publicada',
  RECEIVING_OFFERS: 'Recibiendo ofertas',
  OFFER_ACCEPTED: 'Oferta aceptada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

/** Tono de DISEÑO.md (sección 10) para cada estado real de la solicitud. */
const TONO_ESTADO: Record<string, string | undefined> = {
  PUBLISHED: 'info',
  RECEIVING_OFFERS: 'atencion',
  OFFER_ACCEPTED: 'exito',
  COMPLETED: 'neutro',
  CANCELLED: 'neutro',
};

const ETIQUETA_URGENCIA: Record<string, string | undefined> = {
  BAJA: 'Urgencia baja',
  MEDIA: 'Urgencia media',
  ALTA: 'Urgencia alta',
};

const TONO_URGENCIA: Record<string, string | undefined> = {
  BAJA: 'neutro',
  MEDIA: 'atencion',
  ALTA: 'peligro',
};


/**
 * Tarjeta de una solicitud (dumb): la usan las solicitudes abiertas del
 * proveedor (M2.1) y "Mis solicitudes" del comprador (M2.3).
 *
 * Presentación pura: recibe la solicitud por input, no toca la API.
 */
@Component({
  selector: 'app-tarjeta-solicitud',
  imports: [DatePipe, MatChipsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="fila">
      <div class="fila__icono">
        @if (iconoCategoria(); as icono) {
          <span class="icono icono--categoria-{{ icono }}" aria-hidden="true"></span>
        } @else {
          <mat-icon aria-hidden="true">build</mat-icon>
        }
      </div>

      <div class="fila__contenido">
        @if (solicitud().category_name; as categoria) {
          <p class="fila__categoria texto-xs">{{ categoria }}</p>
        }
        <h3 class="fila__titulo">{{ solicitud().description }}</h3>
        <div class="fila__meta">
          <span>
            <mat-icon aria-hidden="true">directions_car</mat-icon>
            {{ vehiculo() }}
          </span>
          <span>
            <mat-icon aria-hidden="true">location_on</mat-icon>
            {{ solicitud().city }}
          </span>
          <span>
            <mat-icon aria-hidden="true">schedule</mat-icon>
            <time class="num" [attr.datetime]="solicitud().created_at">
              {{ solicitud().created_at | date: 'dd/MM/yyyy' }}
            </time>
          </span>
        </div>
      </div>

      <div class="fila__estados">
        <span
          class="estado"
          [class]="'estado--' + (TONO_URGENCIA[solicitud().urgency] ?? 'neutro')"
        >
          {{ ETIQUETA_URGENCIA[solicitud().urgency] ?? solicitud().urgency }}
        </span>
        <span class="estado" [class]="'estado--' + (TONO_ESTADO[solicitud().status] ?? 'neutro')">
          {{ ETIQUETA_ESTADO[solicitud().status] ?? solicitud().status }}
        </span>
      </div>

      <div class="fila__accion">
        <ng-content select="[accion]" />
      </div>
    </article>
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

  /** Slug del ícono propio de la categoría, o null si no hay uno (sección 10). */
  readonly iconoCategoria = computed(() => iconoCategoriaPorNombre(this.solicitud().category_name));

  protected readonly ETIQUETA_ESTADO = ETIQUETA_ESTADO;
  protected readonly TONO_ESTADO = TONO_ESTADO;
  protected readonly ETIQUETA_URGENCIA = ETIQUETA_URGENCIA;
  protected readonly TONO_URGENCIA = TONO_URGENCIA;
}
