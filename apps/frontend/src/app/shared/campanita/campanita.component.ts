import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

import { mensajeDeError } from '../../core/error/api-error';
import { Aviso, NotificacionesFacade } from '../../facades/notificaciones.facade';

/** Cada cuánto se vuelve a consultar el contador (docs/frontend.md). */
const INTERVALO_MS = 15_000;

/**
 * Campanita de la barra superior (docs/frontend.md → "Común"): contador de
 * avisos sin leer cada 15 s y lista desplegable. Al hacer clic en un aviso
 * navega a su `link` y lo marca como leído.
 *
 * Es un componente "vivo" (inyecta facades y el Router): se monta en el
 * layout común de los tres roles. El contador es informativo: si la
 * consulta falla, la campanita no rompe la pantalla.
 */
@Component({
  selector: 'app-campanita',
  imports: [DatePipe, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './campanita.component.html',
  styleUrl: './campanita.component.scss',
})
export class CampanitaComponent implements OnInit, OnDestroy {
  private readonly notificaciones = inject(NotificacionesFacade);
  private readonly router = inject(Router);

  readonly conteo = signal(0);
  readonly abierto = signal(false);
  readonly avisos = signal<Aviso[]>([]);
  readonly cargandoLista = signal(false);
  readonly accionando = signal(false);
  readonly error = signal<string | null>(null);

  private temporizador: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.actualizarConteo();
    this.temporizador = setInterval(() => void this.actualizarConteo(), INTERVALO_MS);
  }

  ngOnDestroy(): void {
    if (this.temporizador !== null) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }
  }

  /** GET /notifications/unread-count → número del badge. */
  async actualizarConteo(): Promise<void> {
    try {
      this.conteo.set(await this.notificaciones.sinLeer());
    } catch {
      // Informativo: sin contador la pantalla sigue funcionando.
    }
  }

  /** Abre el panel (pidiendo los avisos) o lo cierra. */
  async alternar(): Promise<void> {
    if (this.abierto()) {
      this.abierto.set(false);
      return;
    }

    this.abierto.set(true);
    await this.cargarAvisos();
  }

  /** GET /notifications/mine → la lista del panel. */
  async cargarAvisos(): Promise<void> {
    this.cargandoLista.set(true);
    this.error.set(null);
    try {
      this.avisos.set(await this.notificaciones.avisos());
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargandoLista.set(false);
    }
  }

  /** Clic en un aviso: navega a su link y lo marca como leído. */
  async abrirAviso(aviso: Aviso): Promise<void> {
    this.abierto.set(false);
    if (aviso.link) void this.router.navigate([aviso.link]);
    if (aviso.read) return;

    this.accionando.set(true);
    try {
      await this.notificaciones.marcarLeida(aviso.id);
      this.avisos.update((lista) =>
        lista.map((item) => (item.id === aviso.id ? { ...item, read: true } : item)),
      );
      await this.actualizarConteo();
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.accionando.set(false);
    }
  }

  /** PATCH read-all → todo leído y contador en cero. */
  async marcarTodas(): Promise<void> {
    this.accionando.set(true);
    this.error.set(null);
    try {
      await this.notificaciones.marcarTodasLeidas();
      this.avisos.update((lista) => lista.map((item) => ({ ...item, read: true })));
      await this.actualizarConteo();
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.accionando.set(false);
    }
  }
}
