import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';

import { mensajeDeError } from '../../../core/error/api-error';
import { PANEL } from '../../../core/auth/session.model';
import { AuthFacade } from '../../../facades/auth.facade';

/**
 * Pantalla de inicio de sesión (docs/frontend.md → `/login`).
 *
 * Smart: pide el login a la facade y, según el rol que devuelve el backend,
 * navega al panel correspondiente. El backend manda el rol: el frontend no
 * decide a dónde va cada quien.
 */
@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly facade = inject(AuthFacade);
  private readonly router = inject(Router);

  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    contrasena: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  /** Mensaje de error del backend (o de red) mostrado bajo el formulario. */
  protected readonly error = signal<string | null>(null);
  protected readonly enviando = signal(false);

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    try {
      const usuario = await this.facade.login(this.form.getRawValue());
      await this.router.navigate([PANEL[usuario.rol]]);
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.enviando.set(false);
    }
  }
}
