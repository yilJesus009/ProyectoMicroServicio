import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { VehiculosComponent } from './vehiculos.component';

const MINE_URL = `${environment.apiUrl}/vehicles/mine`;
const VEHICULOS_URL = `${environment.apiUrl}/vehicles`;

const VEHICULO = { id: 9, brand: 'Toyota', model: 'Corolla', year: 2018, plate: 'ABC123' };

describe('VehiculosComponent', () => {
  let fixture: ComponentFixture<VehiculosComponent>;
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiculosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(VehiculosComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('carga y muestra mis vehículos', async () => {
    http.expectOne(MINE_URL).flush({ status: 200, msg: 'Operación exitosa', data: [VEHICULO] });
    await ceder();

    expect(texto()).toContain('Toyota Corolla 2018');
    expect(texto()).toContain('ABC123');
  });

  it('registrar manda POST con los campos del contrato y recarga', async () => {
    http.expectOne(MINE_URL).flush({ status: 200, msg: 'Operación exitosa', data: [] });
    await ceder();

    fixture.componentInstance.form.setValue({
      brand: 'Mazda',
      model: '3',
      year: 2020,
      plate: 'XYZ789',
    });
    boton('Registrar vehículo').click();

    const req = http.expectOne(VEHICULOS_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      brand: 'Mazda',
      model: '3',
      year: 2020,
      plate: 'XYZ789',
    });
    req.flush({
      status: 201,
      msg: 'Vehículo registrado',
      data: { id: 10, brand: 'Mazda', model: '3', year: 2020, plate: 'XYZ789' },
    });

    await ceder();
    http.expectOne(MINE_URL).flush({
      status: 200,
      msg: 'Operación exitosa',
      data: [{ id: 10, brand: 'Mazda', model: '3', year: 2020, plate: 'XYZ789' }],
    });
    await ceder();

    expect(texto()).toContain('Vehículo registrado.');
    expect(texto()).toContain('Mazda 3 2020');
  });

  it('con un año fuera de rango no se manda ninguna petición', async () => {
    http.expectOne(MINE_URL).flush({ status: 200, msg: 'Operación exitosa', data: [] });
    await ceder();

    fixture.componentInstance.form.setValue({
      brand: 'Mazda',
      model: '3',
      year: 1800,
      plate: '',
    });
    boton('Registrar vehículo').click();
    fixture.detectChanges();

    http.expectNone(VEHICULOS_URL);
    expect(fixture.componentInstance.form.controls.year.invalid).toBeTrue();
    expect(texto()).toContain('Año entre 1950');
  });

  it('eliminar hace DELETE al id y recarga la lista', async () => {
    http.expectOne(MINE_URL).flush({ status: 200, msg: 'Operación exitosa', data: [VEHICULO] });
    await ceder();

    boton('Eliminar').click();

    const req = http.expectOne(`${VEHICULOS_URL}/9`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ status: 200, msg: 'Vehículo eliminado', data: null });

    await ceder();
    http.expectOne(MINE_URL).flush({ status: 200, msg: 'Operación exitosa', data: [] });
    await ceder();

    expect(texto()).toContain('Toyota Corolla fue eliminado.');
    expect(texto()).toContain('Aún no registras vehículos.');
  });
});
