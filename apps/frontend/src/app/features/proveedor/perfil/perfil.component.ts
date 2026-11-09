import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { mensajeDeError } from '../../../core/error/api-error';
import { CatalogoFacade, Categoria } from '../../../facades/catalogo.facade';
import { PerfilProveedor, SuppliersFacade } from '../../../facades/suppliers.facade';
import { EstadoPerfilComponent } from '../../../shared/estado-perfil/estado-perfil.component';

/**
 * `/proveedor/perfil` (docs/frontend.md): el proveedor completa su perfil
 * comercial y ve su estado (pendiente, aprobado o rechazado con motivo).
 *
 * Smart: lee `GET /suppliers/me` (404 → sin perfil, no es error) y las
 * categorías activas de Catálogo; guarda con `PUT /suppliers/me`, que
 * siempre deja el perfil PENDING (contrato).
 */
@Component({
  selector: 'app-perfil-proveedor',
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
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilProveedorComponent {
  private readonly suppliers = inject(SuppliersFacade);
  private readonly catalogo = inject(CatalogoFacade);

  /** Perfil propio, o null si todavía no existe. */
  readonly perfil = signal<PerfilProveedor | null>(null);
  readonly categorias = signal<Categoria[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly form = new FormGroup({
    business_name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    city: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(20)],
    }),
    category_ids: new FormControl<number[]>([], {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
  });

  constructor() {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      const [perfil, categorias] = await Promise.all([
        this.suppliers.miPerfil(),
        this.catalogo.categoriasActivas(),
      ]);
      this.perfil.set(perfil);
      this.categorias.set(categorias);
      if (perfil) {
        this.form.setValue({
          business_name: perfil.business_name,
          city: perfil.city,
          phone: perfil.phone,
          category_ids: [...perfil.category_ids],
        });
      }
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.aviso.set(null);

    const valor = this.form.getRawValue();
    try {
      const perfil = await this.suppliers.guardarPerfil({
        business_name: valor.business_name.trim(),
        city: valor.city.trim(),
        phone: valor.phone.trim(),
        category_ids: valor.category_ids,
      });
      this.perfil.set(perfil);
      this.aviso.set('Perfil guardado. Quedó pendiente de aprobación del administrador.');
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.guardando.set(false);
    }
  }
}
