import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { mensajeDeError } from '../../../core/error/api-error';
import { CatalogoFacade, Categoria } from '../../../facades/catalogo.facade';

/** Campos de un formulario de categoría (alta y edición comparten shape). */
type FormularioCategoria = FormGroup<{
  name: FormControl<string>;
  description: FormControl<string>;
  icon: FormControl<string>;
}>;

/** Rellena un formulario con los datos de una categoría (vacío si es null). */
function rellenar(form: FormularioCategoria, categoria: Categoria): void {
  form.setValue({
    name: categoria.name,
    description: categoria.description ?? '',
    icon: categoria.icon ?? '',
  });
}

/**
 * `/admin/categorias` (docs/frontend.md): lista, crear, editar y activar o
 * desactivar categorías. Nunca se borran: se desactivan (contrato).
 *
 * Smart: todo contra CatalogoFacade. El alta y la edición usan el mismo
 * shape { name, description?, icon? } del contrato.
 */
@Component({
  selector: 'app-admin-categorias',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.scss',
})
export class AdminCategoriasComponent {
  private readonly catalogo = inject(CatalogoFacade);

  readonly lista = signal<Categoria[]>([]);
  readonly cargando = signal(true);
  readonly accionando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  /** Id de la categoría que se está editando en línea, o null. */
  readonly editandoId = signal<number | null>(null);

  readonly formAlta = this.crearFormulario();
  readonly formEdicion = this.crearFormulario();

  constructor() {
    void this.cargar();
  }

  private crearFormulario(): FormularioCategoria {
    return new FormGroup({
      name: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(80)],
      }),
      description: new FormControl('', { nonNullable: true }),
      icon: new FormControl('', { nonNullable: true }),
    });
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.lista.set(await this.catalogo.categoriasTodas());
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  /** POST /admin/categories — description e icon solo si traen texto. */
  async crear(): Promise<void> {
    if (this.formAlta.invalid) {
      this.formAlta.markAllAsTouched();
      return;
    }

    this.accionando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    try {
      const valor = this.formAlta.getRawValue();
      await this.catalogo.crearCategoria({
        name: valor.name.trim(),
        description: valor.description.trim() || undefined,
        icon: valor.icon.trim() || undefined,
      });
      this.aviso.set('Categoría creada.');
      this.formAlta.reset();
      await this.cargar();
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.accionando.set(false);
    }
  }

  /** Abre la edición en línea con los datos actuales de la categoría. */
  abrirEdicion(categoria: Categoria): void {
    rellenar(this.formEdicion, categoria);
    this.editandoId.set(categoria.id);
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
  }

  /** PUT /admin/categories/{id}. */
  async guardarEdicion(categoria: Categoria): Promise<void> {
    if (this.formEdicion.invalid) {
      this.formEdicion.markAllAsTouched();
      return;
    }

    this.accionando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    try {
      const valor = this.formEdicion.getRawValue();
      await this.catalogo.editarCategoria(categoria.id, {
        name: valor.name.trim(),
        description: valor.description.trim() || undefined,
        icon: valor.icon.trim() || undefined,
      });
      this.aviso.set('Categoría actualizada.');
      this.cancelarEdicion();
      await this.cargar();
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.accionando.set(false);
    }
  }

  /** PATCH /admin/categories/{id}/toggle — activa o desactiva. */
  async alternar(categoria: Categoria): Promise<void> {
    if (this.accionando()) return;

    this.accionando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    try {
      await this.catalogo.alternarCategoria(categoria.id);
      this.aviso.set(
        categoria.active
          ? `${categoria.name} quedó desactivada.`
          : `${categoria.name} quedó activada.`,
      );
      await this.cargar();
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.accionando.set(false);
    }
  }
}
