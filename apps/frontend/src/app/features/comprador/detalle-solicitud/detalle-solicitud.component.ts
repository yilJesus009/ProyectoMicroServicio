import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { PedidosFacade } from '../../../facades/pedidos.facade';
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
 *
 * Después de aceptar muestra "Generando tu pedido…" y consulta
 * `GET /orders/by-offer/{offerId}` cada 2 s (404 mientras no exista, tope
 * de intentos); al encontrarlo navega a su pago. La foto del detalle se
 * carga como blob con el token y se libera el object URL al destruir.
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
export class DetalleSolicitudComponent implements OnDestroy {
  /** Intentos máximos del polling (15 × 2 s = 30 s) antes de rendirse. */
  private static readonly MAX_INTENTOS_PEDIDO = 15;

  private readonly solicitudes = inject(SolicitudesFacade);
  private readonly pedidos = inject(PedidosFacade);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly solicitud = signal<Solicitud | null>(null);
  readonly ofertas = signal<Oferta[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly orden = signal<OrdenOfertas>('price');
  readonly aceptando = signal<number | null>(null);
  /** Oferta que se está esperando confirmar (null = sin diálogo en pantalla). */
  readonly porConfirmar = signal<Oferta | null>(null);
  /** "Generando tu pedido…" mientras corre el polling by-offer. */
  readonly generando = signal(false);
  /** Object URL de la foto del detalle (blob con token), null si no hay. */
  readonly fotoUrl = signal<string | null>(null);

  private id = 0;
  private temporizadorPedido: ReturnType<typeof setTimeout> | null = null;
  private intentosPedido = 0;

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
      if (solicitud.photo) void this.cargarFoto();
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  /**
   * GET /part-requests/{id}/photo → object URL. El token lo pone el
   * interceptor; si falla, el detalle sigue usable sin foto.
   */
  private async cargarFoto(): Promise<void> {
    try {
      const blob = await this.solicitudes.foto(this.id);
      this.fotoUrl.set(URL.createObjectURL(blob));
    } catch {
      // Sin foto visible no se bloquea la pantalla.
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

      // El pedido nace del evento OFFER_ACCEPTED en el backend: se espera
      // con polling cada 2 s y, cuando exista, se va a su pantalla de pago.
      this.generando.set(true);
      this.intentosPedido = 0;
      this.programarEsperaDePedido(resultado.offer.id);
    } catch (err) {
      // Un 409/422 se muestra tal cual (msg del sobre); el panel queda
      // abierto para que la persona pueda reintentar o cancelar.
      this.error.set(mensajeDeError(err));
    } finally {
      this.aceptando.set(null);
    }
  }

  /** Agenda el siguiente chequeo de `GET /orders/by-offer/{offerId}` (2 s). */
  private programarEsperaDePedido(offerId: number): void {
    this.temporizadorPedido = setTimeout(() => void this.esperarPedido(offerId), 2000);
  }

  /** Un intento del polling: 404 sigue, encontrado navega al pago. */
  private async esperarPedido(offerId: number): Promise<void> {
    try {
      const pedido = await this.pedidos.porOferta(offerId);
      if (pedido) {
        this.generando.set(false);
        await this.router.navigate(['/comprador/pedidos', pedido.id, 'pago']);
        return;
      }
    } catch {
      // Error de red o distinto de 404: se cuenta como intento y se reintenta.
    }

    this.intentosPedido += 1;
    if (this.intentosPedido >= DetalleSolicitudComponent.MAX_INTENTOS_PEDIDO) {
      this.generando.set(false);
      this.aviso.set(
        'El pedido está tardando más de lo esperado. Revisa "Ver mis pedidos" en unos minutos.',
      );
      return;
    }
    this.programarEsperaDePedido(offerId);
  }

  ngOnDestroy(): void {
    if (this.temporizadorPedido !== null) clearTimeout(this.temporizadorPedido);
    const foto = this.fotoUrl();
    if (foto) URL.revokeObjectURL(foto);
  }
}
