import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';

import { EstadoPerfil } from '../../facades/suppliers.facade';

/**
 * Badge del estado del perfil comercial (dumb: puro presentacional).
 *
 * Se usa en el perfil del proveedor (M2.1) y en la tabla de admin de
 * proveedores (M2.2): es el ejemplo de reutilización de la fase 2.
 */
@Component({
  selector: 'app-estado-perfil',
  imports: [MatChipsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-chip class="estado" [class]="'estado-' + estado()">{{ etiqueta() }}</mat-chip>
    @if (estado() === 'REJECTED' && motivo(); as motivoRechazo) {
      <p class="motivo">Motivo: {{ motivoRechazo }}</p>
    }
  `,
  styles: `
    .estado-PENDING {
      background: #fff3cd;
      color: #8a6d00;
    }
    .estado-APPROVED {
      background: #d4edda;
      color: #1e6b34;
    }
    .estado-REJECTED {
      background: #f8d7da;
      color: #842029;
    }
    .motivo {
      margin: 0.4rem 0 0;
      font-size: 0.85rem;
      color: #842029;
    }
  `,
})
export class EstadoPerfilComponent {
  /** Estado actual del perfil (obligatorio). */
  readonly estado = input.required<EstadoPerfil>();

  /** Motivo de rechazo; se muestra solo cuando el estado es REJECTED. */
  readonly motivo = input<string | null>(null);

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
