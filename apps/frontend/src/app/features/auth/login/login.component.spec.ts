import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { Usuario } from '../../../core/auth/session.model';
import { LoginComponent } from './login.component';

const USUARIO: Usuario = {
  id: 7,
  nombre: 'Ana Comprador',
  email: 'ana@repuestosya.com',
  telefono: null,
  ciudad: null,
  rol: 'COMPRADOR',
};

const LOGIN_URL = `${environment.apiUrl}/auth/login`;

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let http: HttpTestingController;
  let router: Router;

  /** Escribe en un input como lo haría la persona y dispara el evento. */
  function escribir(indice: number, valor: string): void {
    const input = (fixture.nativeElement as HTMLElement).querySelectorAll('input')[indice];
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  function enviar(): void {
    const form = (fixture.nativeElement as HTMLElement).querySelector('form');
    form?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('crea la pantalla con el formulario vacío', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Iniciar sesión');
    expect(fixture.componentInstance.form.valid).toBeFalse();
  });

  it('con campos vacíos no manda ninguna petición', () => {
    enviar();

    http.expectNone(LOGIN_URL);
    expect(fixture.componentInstance.form.invalid).toBeTrue();
  });

  it('con un correo mal escrito no manda ninguna petición', () => {
    escribir(0, 'no-es-un-correo');
    escribir(1, 'secreta123');
    enviar();

    http.expectNone(LOGIN_URL);
    expect(fixture.componentInstance.form.controls.email.invalid).toBeTrue();
  });

  it('envía el login y entra al panel del rol que devuelve el backend', async () => {
    escribir(0, USUARIO.email);
    escribir(1, 'secreta123');
    enviar();

    const req = http.expectOne(LOGIN_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: USUARIO.email, contrasena: 'secreta123' });
    req.flush({
      status: 200,
      msg: 'Inicio de sesión exitoso',
      data: { token: 'tok-123', expires_in: 3600, usuario: USUARIO },
    });

    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/comprador/solicitudes']);
    expect(localStorage.getItem('repuestosya_token')).toBe('tok-123');
  });

  it('muestra el msg del backend cuando las credenciales son incorrectas', async () => {
    escribir(0, USUARIO.email);
    escribir(1, 'mala');
    enviar();

    http
      .expectOne(LOGIN_URL)
      .flush(
        { status: 401, msg: 'Credenciales incorrectas', data: null },
        { status: 401, statusText: 'Unauthorized' },
      );

    await fixture.whenStable();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Credenciales incorrectas');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
