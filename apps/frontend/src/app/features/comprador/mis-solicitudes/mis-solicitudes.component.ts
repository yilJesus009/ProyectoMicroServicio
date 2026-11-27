import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { mensajeDeError } from '../../../core/error/api-error';
import { Solicitud, SolicitudesFacade } from '../../../facades/solicitudes.facade';
import { TarjetaSolicitudComponent } from '../../../shared/tarjeta-solicitud/tarjeta-solicitud.component';

/** Texto del enlace de cada fila según el estado de la solicitud. */
const ETIQUETA_ACCION: Record<string, string | undefined> = {
  PUBLISHED: 'Ver solicitud',
  RECEIVING_OFFERS: 'Ver ofertas',
  OFFER_ACCEPTED: 'Ver pedido',
  COMPLETED: 'Ver pedido',
  CANCELLED: 'Ver solicitud',
};

/**
 * `/comprador/solicitudes` (docs/frontend.md): las solicitudes que publicó
 * el comprador, con su estado en pantalla.
 *
 * Smart mínimo: una sola llamada a `GET /part-requests/mine`; la tarjeta
 * (estado, vehículo, fecha) es el componente dumb reutilizado del proveedor.
 */
@Component({
  selector: 'app-mis-solicitudes',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    RouterLink,
    TarjetaSolicitudComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mis-solicitudes.component.html',
  styleUrl: './mis-solicitudes.component.scss',
})
export class MisSolicitudesComponent {
  private readonly solicitudes = inject(SolicitudesFacade);

  readonly lista = signal<Solicitud[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  /** "1 solicitud" / "4 solicitudes" (singular y plural, sin "publicadas"). */
  readonly contador = computed(() => {
    const n = this.lista().length;
    return n === 1 ? '1 solicitud' : `${n} solicitudes`;
  });

  protected readonly ETIQUETA_ACCION = ETIQUETA_ACCION;

  constructor() {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      this.lista.set(await this.solicitudes.mias());
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargando.set(false);
    }
  }
}
