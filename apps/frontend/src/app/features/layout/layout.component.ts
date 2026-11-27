import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';

import { AuthFacade } from '../../facades/auth.facade';
import { CampanitaComponent } from '../../shared/campanita/campanita.component';
import { ItemMenu, MENU_POR_ROL, NOMBRE_ROL } from './menu';

/** Punto de quiebre de escritorio de DISEÑO.md (sección 8). */
const ESCRITORIO = '(min-width: 1024px)';

/**
 * Layout común a los tres roles: barra superior con la marca, la campanita
 * de avisos, quién es la persona y el botón de salir; menú lateral distinto
 * según el rol; y el contenido de la ruta activa.
 *
 * Smart mínimo: solo lee la sesión y el menú de la facade. Los enlaces son
 * rutas reales de docs/frontend.md.
 */
@Component({
  selector: 'app-layout',
  imports: [
    CampanitaComponent,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  private readonly facade = inject(AuthFacade);
  private readonly breakpointObserver = inject(BreakpointObserver);

  protected readonly usuario = this.facade.usuario;
  protected readonly nombreRol = computed(() => {
    const rol = this.facade.rol();
    return rol ? NOMBRE_ROL[rol] : '';
  });

  /** Los enlaces del menú salen del rol actual; sin rol no hay menú. */
  protected readonly menu = computed<readonly ItemMenu[]>(() => {
    const rol = this.facade.rol();
    return rol ? MENU_POR_ROL[rol] : [];
  });

  /**
   * Punto de quiebre de escritorio (sección 8 de DISEÑO.md): a partir de acá
   * el menú lateral queda fijo (`mode="side"`); por debajo es un panel que se
   * abre sobre el contenido (`mode="over"`).
   */
  protected readonly esEscritorio = toSignal(
    this.breakpointObserver.observe(ESCRITORIO).pipe(map((resultado) => resultado.matches)),
    { initialValue: true },
  );

  protected readonly modoMenu = computed<'side' | 'over'>(() =>
    this.esEscritorio() ? 'side' : 'over',
  );

  protected readonly abierto = signal(true);

  constructor() {
    // Al cruzar el punto de quiebre, el menú vuelve a su estado por defecto
    // de ese tamaño: fijo y abierto en escritorio, cerrado en móvil/tablet.
    effect(() => {
      this.abierto.set(this.esEscritorio());
    });
  }

  alternar(): void {
    this.abierto.update((abierto) => !abierto);
  }

  /** En móvil, el menú se cierra tras navegar a una pantalla. */
  cerrarSiMovil(): void {
    if (!this.esEscritorio()) {
      this.abierto.set(false);
    }
  }

  salir(): void {
    this.facade.cerrarSesion();
  }
}
