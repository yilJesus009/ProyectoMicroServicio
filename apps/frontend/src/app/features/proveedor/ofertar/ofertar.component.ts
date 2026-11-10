import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';

import { mensajeDeError } from '../../../core/error/api-error';
import { Solicitud, SolicitudesFacade } from '../../../facades/solicitudes.facade';

/**
 * `/proveedor/solicitudes/:id/ofertar` (docs/frontend.md): formulario de
 * oferta contra `POST /part-requests/{id}/offers`.
 *
 * Smart: pide el detalle de la solicitud para mostrar qué se está ofertando y
 * envía el body snake_case que valida el DTO del backend (409 si ya tiene
 * oferta activa, 422 si la solicitud no acepta → se muestra SU `msg`).
 */
@Component({
  selector: 'app-ofertar',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ofertar.component.html',
  styleUrl: './ofertar.component.scss',
})
export class OfertarComponent {
  private readonly solicitudes = inject(SolicitudesFacade);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly solicitud = signal<Solicitud | null>(null);
  readonly cargando = signal(true);
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  readonly formulario = this.fb.nonNullable.group({
    price: ['', [Validators.required, Validators.min(0.01)]],
    brand: ['', [Validators.required, Validators.maxLength(100)]],
    condition: ['NEW', Validators.required],
    availability: ['IN_STOCK', Validators.required],
    delivery_type: ['DELIVERY', Validators.required],
    estimated_days: [1, [Validators.required, Validators.min(0)]],
    notes: [''],
  });

  private readonly id = Number(this.ruta.snapshot.paramMap.get('id'));

  constructor() {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      this.solicitud.set(await this.solicitudes.detalle(this.id));
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  async enviar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    const v = this.formulario.getRawValue();
    try {
      await this.solicitudes.enviarOferta(this.id, {
        price: Number(v.price),
        brand: v.brand.trim(),
        condition: v.condition as 'NEW' | 'USED' | 'REFURBISHED',
        availability: v.availability as 'IN_STOCK' | 'ON_ORDER',
        delivery_type: v.delivery_type as 'DELIVERY' | 'PICKUP',
        estimated_days: Number(v.estimated_days),
        notes: v.notes.trim() ? v.notes.trim() : null,
      });
      await this.router.navigate(['/proveedor/ofertas']);
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.enviando.set(false);
    }
  }
}
