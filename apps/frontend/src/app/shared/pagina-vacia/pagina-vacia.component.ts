import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';

/**
 * Página vacía: todas las rutas de docs/frontend.md existen desde la fase 1,
 * pero su contenido llega en la fase 2. Así el menú navega de verdad hoy y
 * después solo hay que sustituir el componente de cada ruta.
 *
 * Es presentación pura: no toca la API ni inyecta servicios de dominio. El
 * título lo trae la ruta (`data: { titulo }`), que es toda la configuración
 * que necesita.
 */
@Component({
  selector: 'app-pagina-vacia',
  imports: [MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="vacia">
      <mat-card-header>
        <mat-card-title>{{ titulo }}</mat-card-title>
        <mat-card-subtitle>Pantalla pendiente</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <p>Esta pantalla se construye en la fase 2. El menú ya apunta a su ruta.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .vacia {
      max-width: 40rem;
    }
  `,
})
export class PaginaVaciaComponent {
  protected readonly titulo: string =
    (inject(ActivatedRoute).snapshot.data['titulo'] as string | undefined) ?? 'Pantalla';
}
