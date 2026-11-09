import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { mensajeDeError } from '../../../core/error/api-error';
import { CatalogoFacade, Categoria } from '../../../facades/catalogo.facade';
import {
  EstadoPerfil,
  PerfilProveedor,
  SuppliersFacade,
} from '../../../facades/suppliers.facade';
import { EstadoPerfilComponent } from '../../../shared/estado-perfil/estado-perfil.component';

/**
 * `/admin/proveedores` (docs/frontend.md): lista los perfiles (pendientes
 * por defecto) y permite aprobar o rechazar con motivo.
 *
 * Smart: usa SuppliersFacade para listar y decidir, y CatalogoFacade solo
 * para traducir los `category_ids` a nombres legibles. La regla de
 * transición vive en el backend; acá solo se refleja (409 → su msg).
 */
@Component({
  selector: 'app-admin-proveedores',
  imports: [
    EstadoPerfilComponent,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './proveedores.component.html',
  styleUrl: './proveedores.component.scss',
})
export class AdminProveedoresComponent {
  private readonly suppliers = inject(SuppliersFacade);
  private readonly catalogo = inject(CatalogoFacade);

  readonly lista = signal<PerfilProveedor[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  /** Estado del filtro; '' = todos. */
  readonly filtro = signal<EstadoPerfil | ''>('PENDING');
  readonly cargando = signal(true);
  readonly accionando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  /** Id del perfil al que se le está escribiendo el motivo de rechazo. */
  readonly rechazandoId = signal<number | null>(null);

  readonly motivo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(500)],
  });

  constructor() {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [lista, categorias] = await Promise.all([
        this.suppliers.listar(this.filtro() || undefined),
        this.catalogo.categoriasTodas(),
      ]);
      this.lista.set(lista);
      this.categorias.set(categorias);
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  /** Cambia el filtro de estado y recarga. */
  cambiarFiltro(estado: EstadoPerfil | ''): void {
    this.filtro.set(estado);
    void this.cargar();
  }

  /** Nombres de las categorías del perfil, para mostrarlos en la tarjeta. */
  nombresCategorias(perfil: PerfilProveedor): string {
    if (perfil.category_ids.length === 0) return 'Sin categorías';
    return perfil.category_ids
      .map((id) => this.categorias().find((categoria) => categoria.id === id)?.name ?? `#${id}`)
      .join(', ');
  }

  /** POST /admin/suppliers/{id}/approve → SUPPLIER_APPROVED. */
  async aprobar(perfil: PerfilProveedor): Promise<void> {
    if (this.accionando()) return;
    this.accionando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    try {
      await this.suppliers.aprobar(perfil.id);
      this.aviso.set(`${perfil.business_name} quedó aprobado.`);
      await this.cargar();
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.accionando.set(false);
    }
  }

  /** Abre el campo de motivo de rechazo en la tarjeta indicada. */
  abrirRechazo(perfil: PerfilProveedor): void {
    this.motivo.reset();
    this.rechazandoId.set(perfil.id);
  }

  /** Cierra el motivo de rechazo sin enviar nada. */
  cancelarRechazo(): void {
    this.rechazandoId.set(null);
    this.motivo.reset();
  }

  /**
   * POST /admin/suppliers/{id}/reject → SUPPLIER_REJECTED. El motivo es
   * obligatorio (contrato): sin texto no se manda nada, solo se marca el
   * campo para que la persona lo escriba.
   */
  async rechazar(perfil: PerfilProveedor): Promise<void> {
    if (this.accionando()) return;

    const texto = this.motivo.getRawValue().trim();
    if (!texto) {
      this.motivo.markAsTouched();
      return;
    }

    this.accionando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    try {
      await this.suppliers.rechazar(perfil.id, texto);
      this.aviso.set(`${perfil.business_name} quedó rechazado.`);
      this.cancelarRechazo();
      await this.cargar();
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.accionando.set(false);
    }
  }
}
