import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import { mensajeDeError } from '../../../core/error/api-error';
import { CatalogoFacade, Categoria } from '../../../facades/catalogo.facade';
import { PerfilProveedor, SuppliersFacade } from '../../../facades/suppliers.facade';
import { FiltroAbiertas, Solicitud, SolicitudesFacade } from '../../../facades/solicitudes.facade';
import { EstadoPerfilComponent } from '../../../shared/estado-perfil/estado-perfil.component';
import { TarjetaSolicitudComponent } from '../../../shared/tarjeta-solicitud/tarjeta-solicitud.component';

/**
 * `/proveedor/solicitudes` (docs/frontend.md): solicitudes abiertas con
 * filtro por ciudad y categoría.
 *
 * Regla del contrato: solo un proveedor APROBADO ve la lista; si su perfil
 * está PENDING o REJECTED se muestra un aviso con su estado en lugar de
 * los datos (la regla la pone el backend con 403, esto solo la refleja).
 */
@Component({
  selector: 'app-solicitudes-abiertas',
  imports: [
    EstadoPerfilComponent,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    RouterLink,
    TarjetaSolicitudComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './solicitudes-abiertas.component.html',
  styleUrl: './solicitudes-abiertas.component.scss',
})
export class SolicitudesAbiertasComponent {
  private readonly suppliers = inject(SuppliersFacade);
  private readonly catalogo = inject(CatalogoFacade);
  private readonly solicitudes = inject(SolicitudesFacade);

  readonly perfil = signal<PerfilProveedor | null>(null);
  readonly categorias = signal<Categoria[]>([]);
  readonly lista = signal<Solicitud[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly filtros = new FormGroup({
    ciudad: new FormControl('', { nonNullable: true }),
    categoria: new FormControl<number | ''>('', { nonNullable: true }),
  });

  constructor() {
    void this.cargar();
  }

  /** Solo el aprobado ve la lista; los demás ven el aviso. */
  get aprobado(): boolean {
    return this.perfil()?.status === 'APPROVED';
  }

  async cargar(): Promise<void> {
    try {
      const perfil = await this.suppliers.miPerfil();
      this.perfil.set(perfil);

      // Sin perfil aprobado no se piden solicitudes: el backend respondería
      // 403, y el aviso ya dice qué hacer.
      if (perfil?.status !== 'APPROVED') return;

      this.categorias.set(await this.catalogo.categoriasActivas());
      await this.buscar();
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  /** Aplica los filtros del formulario (ciudad y categoría). */
  async buscar(): Promise<void> {
    try {
      const filtro: FiltroAbiertas = {};
      const ciudad = this.filtros.value.ciudad?.trim();
      const categoria = this.filtros.value.categoria;
      if (ciudad) filtro.city = ciudad;
      if (categoria !== '' && categoria !== null) filtro.category_id = Number(categoria);

      this.lista.set(await this.solicitudes.abiertas(filtro));
      this.error.set(null);
    } catch (err) {
      this.error.set(mensajeDeError(err));
    }
  }
}
