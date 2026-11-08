import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';

import { mensajeDeError } from '../../../core/error/api-error';
import { Solicitud, SolicitudesFacade } from '../../../facades/solicitudes.facade';
import { TarjetaSolicitudComponent } from '../../../shared/tarjeta-solicitud/tarjeta-solicitud.component';

/**
 * `/comprador/solicitudes` (docs/frontend.md): las solicitudes que publicó
 * el comprador, con su estado en pantalla.
 *
 * Smart mínimo: una sola llamada a `GET /part-requests/mine`; la tarjeta
 * (estado, vehículo, fecha) es el componente dumb reutilizado del proveedor.
 */
@Component({
  selector: 'app-mis-solicitudes',
  imports: [MatButtonModule, MatCardModule, RouterLink, TarjetaSolicitudComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mis-solicitudes.component.html',
  styleUrl: './mis-solicitudes.component.scss',
})
export class MisSolicitudesComponent {
  private readonly solicitudes = inject(SolicitudesFacade);

  readonly lista = signal<Solicitud[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

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
