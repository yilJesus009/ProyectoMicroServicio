import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EstadoPerfil } from '../../facades/suppliers.facade';

/** Tono de DISEÑO.md (sección 10) para cada estado real del perfil de proveedor. */
const TONO_ESTADO: Record<EstadoPerfil, string> = {
  PENDING: 'atencion',
  APPROVED: 'exito',
  REJECTED: 'neutro',
};

/**
 * Badge del estado del perfil comercial (dumb: puro presentacional).
 *
 * Se usa en el perfil del proveedor (M2.1) y en la tabla de admin de
 * proveedores (M2.2): es el ejemplo de reutilización de la fase 2.
 */
@Component({
  selector: 'app-estado-perfil',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="estado" [class]="'estado--' + TONO_ESTADO[estado()]">{{ etiqueta() }}</span>
    @if (estado() === 'REJECTED' && motivo(); as motivoRechazo) {
      <p class="motivo">Motivo: {{ motivoRechazo }}</p>
    }
  `,
  styles: `
    .motivo {
      margin: var(--esp-2) 0 0;
      font-size: var(--texto-sm);
      color: var(--color-tinta-suave);
    }
  `,
})
export class EstadoPerfilComponent {
  /** Estado actual del perfil (obligatorio). */
  readonly estado = input.required<EstadoPerfil>();

  /** Motivo de rechazo; se muestra solo cuando el estado es REJECTED. */
  readonly motivo = input<string | null>(null);

  protected readonly TONO_ESTADO = TONO_ESTADO;

  /** Texto en español del estado (docs/frontend.md → "Estados en pantalla"). */
  readonly etiqueta = computed(() => {
    switch (this.estado()) {
      case 'PENDING':
        return 'Pendiente de aprobación';
      case 'APPROVED':
        return 'Aprobado';
      case 'REJECTED':
        return 'Rechazado';
    }
  });
}
