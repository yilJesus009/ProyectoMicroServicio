import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { Usuario } from '../../../core/auth/session.model';
import { RegistroComponent } from './registro.component';

const USUARIO: Usuario = {
  id: 9,
  nombre: 'Berta Proveedor',
  email: 'berta@repuestosya.com',
  telefono: '71111111',
  ciudad: 'Cochabamba',
  rol: 'PROVEEDOR',
};

const REGISTER_URL = `${environment.apiUrl}/auth/register`;
const LOGIN_URL = `${environment.apiUrl}/auth/login`;

/** Deja correr los microtasks encadenados (register → login → navigate). */
const ceder = () => new Promise<void>((resolver) => setTimeout(resolver, 0));

describe('RegistroComponent', () => {
  let fixture: ComponentFixture<RegistroComponent>;
  let http: HttpTestingController;
  let router: Router;

  function campo(control: string): HTMLInputElement {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      `[formControlName="${control}"]`,
    );
    if (!input) throw new Error(`No existe el campo ${control}`);
    return input;
  }

  function escribir(control: string, valor: string): void {
    const input = campo(control);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  function elegirRol(rol: 'COMPRADOR' | 'PROVEEDOR'): void {
    const botones = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
      'input[type="radio"]',
    );
    const indice = rol === 'COMPRADOR' ? 0 : 1;
    botones[indice].click();
    fixture.detectChanges();
  }

  function enviar(): void {
    const form = (fixture.nativeElement as HTMLElement).querySelector('form');
    form?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function llenarFormulario(): void {
    escribir('nombre', 'Berta Proveedor');
    escribir('email', USUARIO.email);
    escribir('contrasena', 'secreta123');
    escribir('telefono', '71111111');
    escribir('ciudad', 'Cochabamba');
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RegistroComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(RegistroComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('crea la pantalla eligiendo COMPRADOR por defecto', () => {
    expect(fixture.componentInstance.form.controls.rol.value).toBe('COMPRADOR');
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Crear una cuenta');
    expect(texto).toContain('Soy proveedor');
  });

  it('con campos obligatorios vacíos no manda ninguna petición', () => {
    enviar();

    http.expectNone(REGISTER_URL);
    expect(fixture.componentInstance.form.invalid).toBeTrue();
  });

  it('con una contraseña de menos de 8 caracteres no manda ninguna petición', () => {
    escribir('nombre', 'Berta');
    escribir('email', USUARIO.email);
    escribir('contrasena', 'corta');
    fixture.detectChanges();
    enviar();

    http.expectNone(REGISTER_URL);
    expect(fixture.componentInstance.form.controls.contrasena.invalid).toBeTrue();
  });

  it('registra con el rol elegido y después inicia sesión', async () => {
    llenarFormulario();
    elegirRol('PROVEEDOR');
    enviar();

    const registro = http.expectOne(REGISTER_URL);
    expect(registro.request.method).toBe('POST');
    expect(registro.request.body).toEqual({
      nombre: 'Berta Proveedor',
      email: USUARIO.email,
      contrasena: 'secreta123',
      rol: 'PROVEEDOR',
      telefono: '71111111',
      ciudad: 'Cochabamba',
    });
    registro.flush({ status: 201, msg: 'Usuario registrado exitosamente', data: USUARIO });

    // El backend no da token en el registro: el login viene después.
    await ceder();

    const login = http.expectOne(LOGIN_URL);
    expect(login.request.body).toEqual({ email: USUARIO.email, contrasena: 'secreta123' });
    login.flush({
      status: 200,
      msg: 'Inicio de sesión exitoso',
      data: { token: 'tok-9', expires_in: 3600, usuario: USUARIO },
    });

    await ceder();

    expect(router.navigate).toHaveBeenCalledWith(['/proveedor/solicitudes']);
    expect(localStorage.getItem('repuestosya_token')).toBe('tok-9');
  });

  it('muestra el msg del backend cuando el registro se rechaza', async () => {
    llenarFormulario();
    enviar();

    http
      .expectOne(REGISTER_URL)
      .flush(
        { status: 400, msg: 'Ya existe una cuenta con ese correo', data: null },
        { status: 400, statusText: 'Bad Request' },
      );

    await ceder();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Ya existe una cuenta con ese correo');
    expect(router.navigate).not.toHaveBeenCalled();
    // No se intentó el login si el registro falló.
    http.expectNone(LOGIN_URL);
  });
});
