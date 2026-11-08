import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { Router, RouterLink } from '@angular/router';

import { mensajeDeError } from '../../../core/error/api-error';
import { PANEL, Registro } from '../../../core/auth/session.model';
import { AuthFacade } from '../../../facades/auth.facade';

/**
 * Pantalla de registro (docs/frontend.md → `/registro`), eligiendo COMPRADOR
 * o PROVEEDOR. El rol ADMIN no se registra por acá: lo crea el seed.
 *
 * Smart: llama a `registroYEntrar` porque POST /auth/register NO devuelve
 * token (201 con el usuario listo), así que hay que hacer login después.
 */
@Component({
  selector: 'app-registro',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.scss',
})
export class RegistroComponent {
  private readonly facade = inject(AuthFacade);
  private readonly router = inject(Router);

  readonly form = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    // 8 caracteres: el mínimo de AUTH_PASSWORD_VALIDATORS de Django, para
    // que el error venga del backend y no de un límite inventado acá.
    contrasena: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    telefono: new FormControl('', { nonNullable: true }),
    ciudad: new FormControl('', { nonNullable: true }),
    rol: new FormControl<Exclude<Registro['rol'], 'ADMIN'>>('COMPRADOR', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected readonly error = signal<string | null>(null);
  protected readonly enviando = signal(false);

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    const valor = this.form.getRawValue();
    const datos: Registro = {
      nombre: valor.nombre.trim(),
      email: valor.email.trim(),
      contrasena: valor.contrasena,
      rol: valor.rol,
      // Opcionales: si quedaron vacíos no se mandan, para que el backend no
      // reciba strings en blanco en campos que aceptan null.
      ...(valor.telefono.trim() ? { telefono: valor.telefono.trim() } : {}),
      ...(valor.ciudad.trim() ? { ciudad: valor.ciudad.trim() } : {}),
    };

    try {
      const usuario = await this.facade.registroYEntrar(datos);
      await this.router.navigate([PANEL[usuario.rol]]);
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.enviando.set(false);
    }
  }
}
