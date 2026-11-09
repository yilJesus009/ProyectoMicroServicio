import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';

import { mensajeDeError } from '../../../core/error/api-error';
import { CatalogoFacade, Categoria, Vehiculo } from '../../../facades/catalogo.facade';
import { SolicitudesFacade, Urgencia } from '../../../facades/solicitudes.facade';

const ANIO_MIN = 1950;
const ANIO_MAX = new Date().getFullYear() + 1;

/** Tipos de imagen que acepta el contrato (jpg, png o webp). */
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANO_FOTO_MAX = 5 * 1024 * 1024;

/**
 * `/comprador/solicitudes/nueva` (docs/frontend.md): publicar una
 * solicitud — categoría en tarjetas con ícono, uno de mis vehículos o
 * escribirlo, descripción, foto opcional, ciudad y urgencia.
 *
 * Smart: carga categorías y vehículos en paralelo y arma el multipart
 * { category_id, vehicle_brand, vehicle_model, vehicle_year, description,
 * city, urgency, photo? } del contrato. La validación de foto (tipo y
 * 5 MB) es una ayuda del navegador; la revalida el backend.
 */
@Component({
  selector: 'app-nueva-solicitud',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nueva-solicitud.component.html',
  styleUrl: './nueva-solicitud.component.scss',
})
export class NuevaSolicitudComponent {
  private readonly catalogo = inject(CatalogoFacade);
  private readonly solicitudes = inject(SolicitudesFacade);
  private readonly router = inject(Router);

  readonly categorias = signal<Categoria[]>([]);
  readonly vehiculos = signal<Vehiculo[]>([]);
  readonly cargando = signal(true);
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly categoriaElegida = signal<number | null>(null);
  readonly foto = signal<File | null>(null);

  readonly anioMinimo = ANIO_MIN;
  readonly anioMaximo = ANIO_MAX;

  /**
   * vehicleId: '' = escribir los datos a mano; un id = usar uno de mis
   * vehículos. Los campos manuales NO llevan `required` (se validan en
   * `crear()` solo cuando corresponde).
   */
  readonly form = new FormGroup({
    vehicleId: new FormControl<number | ''>('', { nonNullable: true }),
    vehicleBrand: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(60)],
    }),
    vehicleModel: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(60)],
    }),
    vehicleYear: new FormControl<number | null>(null, {
      validators: [Validators.min(ANIO_MIN), Validators.max(ANIO_MAX)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(1000)],
    }),
    city: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    urgency: new FormControl<Urgencia>('MEDIA', { nonNullable: true }),
  });

  constructor() {
    void this.cargar();
  }

  get vehiculoManual(): boolean {
    return this.form.controls.vehicleId.value === '';
  }

  async cargar(): Promise<void> {
    try {
      const [categorias, vehiculos] = await Promise.all([
        this.catalogo.categoriasActivas(),
        this.catalogo.misVehiculos(),
      ]);
      this.categorias.set(categorias);
      this.vehiculos.set(vehiculos);
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  /** Selecciona la categoría en las tarjetas. */
  elegirCategoria(id: number): void {
    this.categoriaElegida.set(id);
    this.error.set(null);
  }

  /** Guarda la foto si su tipo y tamaño cumplen el contrato. */
  alElegirFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;

    if (!archivo) {
      this.foto.set(null);
      return;
    }

    if (!TIPOS_FOTO.includes(archivo.type) || archivo.size > TAMANO_FOTO_MAX) {
      this.error.set('La foto debe ser jpg, png o webp de máximo 5 MB.');
      input.value = '';
      this.foto.set(null);
      return;
    }

    this.error.set(null);
    this.foto.set(archivo);
  }

  /** POST /part-requests (multipart) → navega a mis solicitudes. */
  async crear(): Promise<void> {
    if (this.enviando()) return;

    const categoriaId = this.categoriaElegida();
    if (categoriaId === null) {
      this.error.set('Elige una categoría para tu solicitud.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();
    let vehiculo: { brand: string; model: string; year: number };

    if (valor.vehicleId === '') {
      if (!valor.vehicleBrand.trim() || !valor.vehicleModel.trim() || valor.vehicleYear === null) {
        this.error.set('Completa la marca, el modelo y el año del vehículo.');
        return;
      }
      vehiculo = {
        brand: valor.vehicleBrand.trim(),
        model: valor.vehicleModel.trim(),
        year: Number(valor.vehicleYear),
      };
    } else {
      const existente = this.vehiculos().find((v) => v.id === valor.vehicleId);
      if (!existente) {
        this.error.set('Elige un vehículo válido.');
        return;
      }
      vehiculo = { brand: existente.brand, model: existente.model, year: existente.year };
    }

    this.enviando.set(true);
    this.error.set(null);

    const datos = new FormData();
    datos.append('category_id', String(categoriaId));
    datos.append('vehicle_brand', vehiculo.brand);
    datos.append('vehicle_model', vehiculo.model);
    datos.append('vehicle_year', String(vehiculo.year));
    datos.append('description', valor.description.trim());
    datos.append('city', valor.city.trim());
    datos.append('urgency', valor.urgency);
    if (this.foto()) datos.append('photo', this.foto() as File);

    try {
      await this.solicitudes.crear(datos);
      await this.router.navigate(['/comprador/solicitudes']);
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.enviando.set(false);
    }
  }
}
