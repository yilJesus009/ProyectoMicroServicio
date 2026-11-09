import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { mensajeDeError } from '../../../core/error/api-error';
import { CatalogoFacade, Vehiculo } from '../../../facades/catalogo.facade';

const ANIO_MIN = 1950;
const ANIO_MAX = new Date().getFullYear() + 1;

/**
 * `/comprador/vehiculos` (docs/frontend.md): lista los vehículos del
 * comprador, permite registrar uno nuevo y eliminarlo.
 *
 * Smart: todo contra CatalogoFacade. El año se valida en el navegador con
 * el mismo rango del contrato (1950 … año entrante), pero la regla vive en
 * el backend.
 */
@Component({
  selector: 'app-vehiculos',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vehiculos.component.html',
  styleUrl: './vehiculos.component.scss',
})
export class VehiculosComponent {
  private readonly catalogo = inject(CatalogoFacade);

  /** Límite superior mostrado en el error del año (contrato del backend). */
  readonly anioMaximo = ANIO_MAX;

  readonly lista = signal<Vehiculo[]>([]);
  readonly cargando = signal(true);
  readonly accionando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly form = new FormGroup({
    brand: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    model: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    year: new FormControl<number | null>(null, {
      validators: [
        Validators.required,
        Validators.min(ANIO_MIN),
        Validators.max(ANIO_MAX),
      ],
    }),
    plate: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.lista.set(await this.catalogo.misVehiculos());
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  /** POST /vehicles — plate solo si tiene texto (es opcional). */
  async crear(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.accionando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    try {
      const valor = this.form.getRawValue();
      await this.catalogo.crearVehiculo({
        brand: valor.brand.trim(),
        model: valor.model.trim(),
        year: Number(valor.year),
        plate: valor.plate.trim() || undefined,
      });
      this.aviso.set('Vehículo registrado.');
      this.form.reset({ brand: '', model: '', year: null, plate: '' });
      await this.cargar();
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.accionando.set(false);
    }
  }

  /** DELETE /vehicles/{id} — solo el dueño (el backend lo verifica). */
  async borrar(vehiculo: Vehiculo): Promise<void> {
    if (this.accionando()) return;

    this.accionando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    try {
      await this.catalogo.borrarVehiculo(vehiculo.id);
      this.aviso.set(`${vehiculo.brand} ${vehiculo.model} fue eliminado.`);
      await this.cargar();
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.accionando.set(false);
    }
  }
}
