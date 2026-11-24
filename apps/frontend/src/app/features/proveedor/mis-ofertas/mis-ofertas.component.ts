import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { mensajeDeError } from '../../../core/error/api-error';
import { Oferta, SolicitudesFacade } from '../../../facades/solicitudes.facade';

/** Textos en español de los estados de oferta (igual que offer-card/detalle-solicitud). */
const ETIQUETA_ESTADO: Record<string, string | undefined> = {
  SUBMITTED: 'Enviada',
  ACCEPTED: 'Aceptada',
  REJECTED: 'No elegida',
  WITHDRAWN: 'Retirada',
};

/** Tono de DISEÑO.md (sección 10) para cada estado real de la oferta. */
const TONO_ESTADO: Record<string, string | undefined> = {
  SUBMITTED: 'atencion',
  ACCEPTED: 'exito',
  REJECTED: 'neutro',
  WITHDRAWN: 'neutro',
};

/**
 * `/proveedor/ofertas` (docs/frontend.md): mis ofertas con su estado y el
 * botón "Retirar oferta" (solo para `SUBMITTED`, según el contrato).
 *
 * Smart: pide `GET /offers/mine`; la tarjeta es el dumb
 * `OfferCardComponent` (el mismo que usa el comparador del comprador).
 */
@Component({
  selector: 'app-mis-ofertas',
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatIconModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mis-ofertas.component.html',
  styleUrl: './mis-ofertas.component.scss',
})
export class MisOfertasComponent {
  private readonly solicitudes = inject(SolicitudesFacade);

  readonly lista = signal<Oferta[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly retirando = signal<number | null>(null);

  protected readonly ETIQUETA_ESTADO = ETIQUETA_ESTADO;
  protected readonly TONO_ESTADO = TONO_ESTADO;

  constructor() {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      this.lista.set(await this.solicitudes.misOfertas());
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  /** PATCH /offers/{id}/withdraw — solo SUBMITTED; el backend valida el resto. */
  async retirar(oferta: Oferta): Promise<void> {
    this.retirando.set(oferta.id);
    this.error.set(null);
    this.aviso.set(null);
    try {
      const actualizada = await this.solicitudes.retirar(oferta.id);
      this.lista.set(this.lista().map((o) => (o.id === actualizada.id ? actualizada : o)));
      this.aviso.set('Oferta retirada.');
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.retirando.set(null);
    }
  }
}
