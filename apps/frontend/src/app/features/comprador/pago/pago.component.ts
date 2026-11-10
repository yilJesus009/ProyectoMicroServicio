import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import qrcode from 'qrcode-generator';

import { mensajeDeError } from '../../../core/error/api-error';
import { MetodoPago, Pedido, PedidosFacade } from '../../../facades/pedidos.facade';
import { ETIQUETA_ESTADO_PEDIDO } from '../../../shared/order-card/order-card.component';

/**
 * `/comprador/pedidos/:id/pago` — pantalla de pago simulado
 * (docs/frontend.md → "Pantalla de pago simulado").
 *
 * - Resumen del pedido + aviso "Simulación: no se realiza ningún cobro".
 * - Dos pestañas (QR y Tarjeta) implementadas como botones conmutadores
 *   (sin Material tabs ni animaciones: el proyecto no depende de
 *   `@angular/animations`).
 * - QR generado en el navegador con `qrcode-generator` a partir del texto
 *   `REPUESTOSYA|PEDIDO-{id}|{precio}|{moneda}`.
 * - **Regla crítica (AGENTS.md §4.6):** se envía SOLO `{ method }`. El
 *   formulario de la tarjeta se valida en el navegador y NUNCA sale de él.
 */
@Component({
  selector: 'app-pago',
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pago.component.html',
  styleUrl: './pago.component.scss',
})
export class PagoComponent implements OnDestroy {
  private readonly pedidos = inject(PedidosFacade);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly pedido = signal<Pedido | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly pagando = signal(false);
  readonly pestana = signal<MetodoPago>('QR');

  readonly ETIQUETA = ETIQUETA_ESTADO_PEDIDO;

  /** Datos de demostración precargados (docs/frontend.md). Solo formato. */
  readonly formulario = this.fb.nonNullable.group({
    numero: ['4111 1111 1111 1111', [Validators.required, Validators.pattern(/^\d{4} \d{4} \d{4} \d{4}$/)]],
    vencimiento: ['12/30', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
    cvv: ['123', [Validators.required, Validators.pattern(/^\d{3}$/)]],
  });

  private readonly id = Number(this.ruta.snapshot.paramMap.get('id'));
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  /** Texto de referencia del QR (formato exacto de docs/frontend.md). */
  readonly referenciaQr = computed(() => {
    const pedido = this.pedido();
    if (!pedido) return '';
    return `REPUESTOSYA|PEDIDO-${pedido.id}|${pedido.price.toFixed(2)}|${pedido.currency}`;
  });

  /** Matriz de módulos del QR (true = módulo oscuro), para pintarlo sin innerHTML. */
  readonly matrizQr = computed(() => {
    const texto = this.referenciaQr();
    if (!texto) return null;

    const codigo = qrcode(0, 'M');
    codigo.addData(texto);
    codigo.make();

    const total = codigo.getModuleCount();
    // Quiet zone: el estándar QR exige 4 módulos claros alrededor de la
    // matriz; sin ellos los escáneres pueden no detectar el código.
    const margen = 4;
    const lado = total + margen * 2;
    return Array.from({ length: lado }, (_, fila) =>
      Array.from({ length: lado }, (_, columna) => {
        const f = fila - margen;
        const c = columna - margen;
        return f >= 0 && f < total && c >= 0 && c < total && codigo.isDark(f, c);
      }),
    );
  });

  /** Columnas del grid CSS del QR. */
  readonly columnasQr = computed(() => {
    const matriz = this.matrizQr();
    return `repeat(${matriz?.length ?? 0}, 1fr)`;
  });

  constructor() {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      this.pedido.set(await this.pedidos.detalle(this.id));
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  /**
   * POST /orders/{id}/payment con SOLO `{ method }` — nunca hay datos de
   * tarjeta en la petición, aunque estén en pantalla. Al responder se
   * muestra la referencia y se lleva al seguimiento.
   */
  async pagar(): Promise<void> {
    const metodo = this.pestana();

    if (metodo === 'CARD' && this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.pagando.set(true);
    this.error.set(null);
    try {
      const actualizado = await this.pedidos.pagar(this.id, metodo);
      const referencia = actualizado.payment?.reference ?? null;
      this.pedido.set(actualizado);
      this.aviso.set(
        referencia
          ? `Pago simulado registrado. Referencia: ${referencia}`
          : 'Pago simulado registrado.',
      );
      this.temporizador = setTimeout(() => {
        void this.router.navigate(['/comprador/pedidos', this.id]);
      }, 1500);
    } catch (err) {
      // 409 (ya pagado), 422 (ya no está pendiente), 400 (campo extra)…
      // se muestra el msg del sobre tal cual.
      this.error.set(mensajeDeError(err));
    } finally {
      this.pagando.set(false);
    }
  }

  ngOnDestroy(): void {
    if (this.temporizador !== null) clearTimeout(this.temporizador);
  }
}
