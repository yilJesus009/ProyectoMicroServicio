import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthFacade } from '../../facades/auth.facade';
import { ItemMenu, MENU_POR_ROL, NOMBRE_ROL } from './menu';

/**
 * Layout común a los tres roles: barra superior con la marca, quién es la
 * persona y el botón de salir; menú lateral distinto según el rol; y el
 * contenido de la ruta activa.
 *
 * Smart mínimo: solo lee la sesión y el menú de la facade. Los enlaces son
 * rutas reales de docs/frontend.md.
 */
@Component({
  selector: 'app-layout',
  imports: [
    MatButtonModule,
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

  protected readonly abierto = signal(true);

  alternar(): void {
    this.abierto.update((abierto) => !abierto);
  }

  salir(): void {
    this.facade.cerrarSesion();
  }
}
