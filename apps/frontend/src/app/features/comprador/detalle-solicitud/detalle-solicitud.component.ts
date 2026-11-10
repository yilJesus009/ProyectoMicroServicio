import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';

import { mensajeDeError } from '../../../core/error/api-error';
import {
  Oferta,
  OrdenOfertas,
  Solicitud,
  SolicitudesFacade,
} from '../../../facades/solicitudes.facade';
import { OfferCardComponent } from '../../../shared/offer-card/offer-card.component';
import { TarjetaSolicitudComponent } from '../../../shared/tarjeta-solicitud/tarjeta-solicitud.component';

/**
 * `/comprador/solicitudes/:id` (docs/frontend.md): detalle de la solicitud y
 * **comparador de ofertas**, ordenable por precio o días, con "Aceptar" y
 * confirmación.
 *
 * Smart: pide el detalle y las ofertas a la fachada; la tarjeta es el dumb
 * `OfferCardComponent`. Si el backend responde 409 o 422 (ya hay una oferta
 * aceptada, la solicitud ya no acepta ofertas…) se muestra SU `msg`.
 *
 * La confirmación es un panel en línea (sin MatDialog): el proyecto no
 * depende de `@angular/animations` y así no se agrega una dependencia
 * nueva solo para el diálogo (AGENTS.md §9.7).
 */
@Component({
  selector: 'app-detalle-solicitud',
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatRadioModule,
    OfferCardComponent,
    RouterLink,
    TarjetaSolicitudComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalle-solicitud.component.html',
  styleUrl: './detalle-solicitud.component.scss',
})
export class DetalleSolicitudComponent {
  private readonly solicitudes = inject(SolicitudesFacade);
  private readonly ruta = inject(ActivatedRoute);

  readonly solicitud = signal<Solicitud | null>(null);
  readonly ofertas = signal<Oferta[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly orden = signal<OrdenOfertas>('price');
  readonly aceptando = signal<number | null>(null);
  /** Oferta que se está esperando confirmar (null = sin diálogo en pantalla). */
  readonly porConfirmar = signal<Oferta | null>(null);

  private id = 0;

  constructor() {
    this.id = Number(this.ruta.snapshot.paramMap.get('id'));
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      const [solicitud, ofertas] = await Promise.all([
        this.solicitudes.detalle(this.id),
        this.solicitudes.ofertas(this.id, this.orden()),
      ]);
      this.solicitud.set(solicitud);
      this.ofertas.set(ofertas);
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  /** Cambia el orden del comparador y vuelve a pedir al backend. */
  async cambiarOrden(orden: OrdenOfertas): Promise<void> {
    if (orden === this.orden()) return;
    this.orden.set(orden);
    try {
      this.ofertas.set(await this.solicitudes.ofertas(this.id, orden));
    } catch (err) {
      this.error.set(mensajeDeError(err));
    }
  }

  /** Abre el panel de confirmación para esa oferta. */
  confirmarAceptacion(oferta: Oferta): void {
    this.porConfirmar.set(oferta);
    this.error.set(null);
  }

  /** Cierra el panel sin aceptar. */
  cancelarAceptacion(): void {
    this.porConfirmar.set(null);
  }

  /** Confirma y llama a la operación crítica. */
  async aceptar(): Promise<void> {
    const oferta = this.porConfirmar();
    if (!oferta) return;

    this.aceptando.set(oferta.id);
    this.aviso.set(null);
    this.error.set(null);
    try {
      const resultado = await this.solicitudes.aceptar(oferta.id);
      this.solicitud.set(resultado.part_request);
      this.ofertas.set(
        this.ofertas().map((o) =>
          o.id === resultado.offer.id
            ? resultado.offer
            : o.status === 'SUBMITTED'
              ? { ...o, status: 'REJECTED' as const }
              : o,
        ),
      );
      this.aviso.set('Oferta aceptada. El pedido se generará en unos segundos.');
      this.porConfirmar.set(null);
    } catch (err) {
      // Un 409/422 se muestra tal cual (msg del sobre); el panel queda
      // abierto para que la persona pueda reintentar o cancelar.
      this.error.set(mensajeDeError(err));
    } finally {
      this.aceptando.set(null);
    }
  }
}
