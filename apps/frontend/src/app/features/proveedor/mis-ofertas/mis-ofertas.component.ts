import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { mensajeDeError } from '../../../core/error/api-error';
import { Oferta, SolicitudesFacade } from '../../../facades/solicitudes.facade';
import { OfferCardComponent } from '../../../shared/offer-card/offer-card.component';

/**
 * `/proveedor/ofertas` (docs/frontend.md): mis ofertas con su estado y el
 * botón "Retirar oferta" (solo para `SUBMITTED`, según el contrato).
 *
 * Smart: pide `GET /offers/mine`; la tarjeta es el dumb
 * `OfferCardComponent` (el mismo que usa el comparador del comprador).
 */
@Component({
  selector: 'app-mis-ofertas',
  imports: [MatButtonModule, MatCardModule, OfferCardComponent, RouterLink],
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
