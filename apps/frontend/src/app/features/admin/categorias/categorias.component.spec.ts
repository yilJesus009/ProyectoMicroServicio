import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { AdminCategoriasComponent } from './categorias.component';

const URL = `${environment.apiUrl}/admin/categories`;

const CATEGORIA = {
  id: 1,
  name: 'Frenos',
  description: 'Pastillas, discos y calipers',
  icon: 'brake',
  active: true,
};

describe('AdminCategoriasComponent', () => {
  let fixture: ComponentFixture<AdminCategoriasComponent>;
  let http: HttpTestingController;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  /** Cede el turno a las microtareas encadenadas y repinta. */
  async function ceder(veces = 20): Promise<void> {
    for (let i = 0; i < veces; i++) {
      await Promise.resolve();
    }
    fixture.detectChanges();
  }

  function boton(etiqueta: string): HTMLButtonElement {
    const botones = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    );
    const encontrado = botones.find((b) => (b.textContent ?? '').trim() === etiqueta);
    if (!encontrado) throw new Error(`No existe el botón "${etiqueta}"`);
    return encontrado;
  }

  /** Responde la carga inicial y la recarga posterior a una operación. */
  function responderLista(lista: unknown[] = [CATEGORIA]): void {
    http.expectOne(URL).flush({ status: 200, msg: 'Operación exitosa', data: lista });
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCategoriasComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminCategoriasComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('carga y muestra la lista de categorías con su estado', async () => {
    responderLista();
    await ceder();

    expect(texto()).toContain('Frenos');
    expect(texto()).toContain('Pastillas, discos y calipers');
    expect(texto()).toContain('Activa');
    expect(texto()).toContain('Desactivar');
  });

  it('crear manda POST con los datos del formulario y recarga', async () => {
    responderLista();
    await ceder();

    fixture.componentInstance.formAlta.setValue({
      name: 'Embragues',
      description: 'Platos y discos',
      icon: 'clutch',
    });
    boton('Crear categoría').click();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Embragues',
      description: 'Platos y discos',
      icon: 'clutch',
    });
    req.flush({ status: 201, msg: 'Categoría creada', data: { ...CATEGORIA, id: 4, name: 'Embragues' } });

    await ceder();
    responderLista();
    await ceder();

    expect(texto()).toContain('Categoría creada.');
    expect(fixture.componentInstance.formAlta.value.name).toBe('');
  });

  it('con el nombre vacío no se manda ninguna petición', async () => {
    responderLista();
    await ceder();

    boton('Crear categoría').click();
    fixture.detectChanges();

    http.expectNone(URL);
    expect(fixture.componentInstance.formAlta.invalid).toBeTrue();
    expect(texto()).toContain('Ingresa el nombre');
  });

  it('desactivar hace PATCH al toggle y recarga con el nuevo estado', async () => {
    responderLista();
    await ceder();

    boton('Desactivar').click();

    const req = http.expectOne(`${URL}/1/toggle`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ status: 200, msg: 'Estado actualizado', data: { ...CATEGORIA, active: false } });

    await ceder();
    responderLista([{ ...CATEGORIA, active: false }]);
    await ceder();

    expect(texto()).toContain('Frenos quedó desactivada.');
    expect(texto()).toContain('Inactiva');
    expect(texto()).toContain('Activar');
  });

  it('editar manda PUT con los datos cambiados y cierra la edición', async () => {
    responderLista();
    await ceder();

    boton('Editar').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.formEdicion.value).toEqual({
      name: 'Frenos',
      description: 'Pastillas, discos y calipers',
      icon: 'brake',
    });

    fixture.componentInstance.formEdicion.controls.name.setValue('Frenos y suspensión');
    boton('Guardar cambios').click();

    const req = http.expectOne(`${URL}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      name: 'Frenos y suspensión',
      description: 'Pastillas, discos y calipers',
      icon: 'brake',
    });
    req.flush({ status: 200, msg: 'Categoría actualizada', data: { ...CATEGORIA, name: 'Frenos y suspensión' } });

    await ceder();
    responderLista([{ ...CATEGORIA, name: 'Frenos y suspensión' }]);
    await ceder();

    expect(texto()).toContain('Categoría actualizada.');
    expect(fixture.componentInstance.editandoId()).toBeNull();
    expect(texto()).toContain('Frenos y suspensión');
  });
});
