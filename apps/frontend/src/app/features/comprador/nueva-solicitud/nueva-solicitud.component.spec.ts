import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { NuevaSolicitudComponent } from './nueva-solicitud.component';

const CATEGORIAS_URL = `${environment.apiUrl}/categories`;
const VEHICULOS_URL = `${environment.apiUrl}/vehicles/mine`;
const CREAR_URL = `${environment.apiUrl}/part-requests`;

const CATEGORIAS = [
  { id: 1, name: 'Frenos', description: null, icon: 'brake', active: true },
  { id: 3, name: 'Suspensión', description: null, icon: 'shock', active: true },
];

const VEHICULO = { id: 9, brand: 'Toyota', model: 'Corolla', year: 2018, plate: 'ABC123' };

describe('NuevaSolicitudComponent', () => {
  let fixture: ComponentFixture<NuevaSolicitudComponent>;
  let http: HttpTestingController;
  let router: Router;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  async function ceder(veces = 20): Promise<void> {
    for (let i = 0; i < veces; i++) {
      await Promise.resolve();
    }
    fixture.detectChanges();
  }

  function enviar(): void {
    const form = (fixture.nativeElement as HTMLElement).querySelector('form');
    form?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  /** Responde la carga inicial (categorías + vehículos en paralelo). */
  function responderInicio(vehiculos: unknown[] = [VEHICULO]): void {
    http.expectOne(CATEGORIAS_URL).flush({ status: 200, msg: 'Operación exitosa', data: CATEGORIAS });
    http.expectOne(VEHICULOS_URL).flush({ status: 200, msg: 'Operación exitosa', data: vehiculos });
  }

  /** Deja el formulario completo y una categoría elegida. */
  function llenarFormulario(): void {
    fixture.componentInstance.categoriaElegida.set(1);
    fixture.componentInstance.form.setValue({
      vehicleId: '',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Corolla',
      vehicleYear: 2018,
      description: 'Pastillas de freno delanteras',
      city: 'Santa Cruz',
      urgency: 'ALTA',
    });
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevaSolicitudComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(NuevaSolicitudComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('carga categorías y vehículos y muestra las tarjetas con ícono', async () => {
    responderInicio();
    await ceder();

    expect(texto()).toContain('Frenos');
    expect(texto()).toContain('brake');
    expect(texto()).toContain('Suspensión');
    expect(fixture.componentInstance.vehiculos().length).toBe(1);
  });

  it('sin categoría elegida no manda ninguna petición', async () => {
    responderInicio();
    await ceder();

    fixture.componentInstance.form.setValue({
      vehicleId: '',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Corolla',
      vehicleYear: 2018,
      description: 'Pastillas de freno delanteras',
      city: 'Santa Cruz',
      urgency: 'ALTA',
    });
    enviar();

    http.expectNone(CREAR_URL);
    expect(texto()).toContain('Elige una categoría para tu solicitud.');
  });

  it('crear manda el multipart con los campos del contrato y navega', async () => {
    responderInicio();
    await ceder();
    llenarFormulario();

    enviar();

    const req = http.expectOne(CREAR_URL);
    expect(req.request.method).toBe('POST');
    const datos = req.request.body as FormData;
    expect(datos).toBeInstanceOf(FormData);
    expect(datos.get('category_id')).toBe('1');
    expect(datos.get('vehicle_brand')).toBe('Toyota');
    expect(datos.get('vehicle_model')).toBe('Corolla');
    expect(datos.get('vehicle_year')).toBe('2018');
    expect(datos.get('description')).toBe('Pastillas de freno delanteras');
    expect(datos.get('city')).toBe('Santa Cruz');
    expect(datos.get('urgency')).toBe('ALTA');
    expect(datos.get('photo')).toBeNull();
    req.flush({ status: 201, msg: 'Solicitud creada', data: { id: 34 } });

    await ceder();
    expect(router.navigate).toHaveBeenCalledWith(['/comprador/solicitudes']);
  });

  it('con un vehículo de mis vehículos usa sus datos en el multipart', async () => {
    responderInicio();
    await ceder();

    fixture.componentInstance.categoriaElegida.set(1);
    fixture.componentInstance.form.setValue({
      vehicleId: 9,
      vehicleBrand: '',
      vehicleModel: '',
      vehicleYear: null,
      description: 'Pastillas de freno delanteras',
      city: 'Santa Cruz',
      urgency: 'MEDIA',
    });
    fixture.detectChanges();
    enviar();

    const req = http.expectOne(CREAR_URL);
    const datos = req.request.body as FormData;
    expect(datos.get('vehicle_brand')).toBe('Toyota');
    expect(datos.get('vehicle_model')).toBe('Corolla');
    expect(datos.get('vehicle_year')).toBe('2018');
    expect(datos.get('urgency')).toBe('MEDIA');
    req.flush({ status: 201, msg: 'Solicitud creada', data: { id: 35 } });

    await ceder();
    expect(router.navigate).toHaveBeenCalledWith(['/comprador/solicitudes']);
  });

  it('con datos de vehículo incompletos no manda nada', async () => {
    responderInicio();
    await ceder();

    fixture.componentInstance.categoriaElegida.set(1);
    fixture.componentInstance.form.setValue({
      vehicleId: '',
      vehicleBrand: '',
      vehicleModel: '',
      vehicleYear: null,
      description: 'Pastillas de freno delanteras',
      city: 'Santa Cruz',
      urgency: 'ALTA',
    });
    enviar();

    http.expectNone(CREAR_URL);
    expect(texto()).toContain('Completa la marca, el modelo y el año del vehículo.');
  });

  it('una foto que no es jpg, png o webp no se guarda', async () => {
    responderInicio();
    await ceder();

    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type=file]',
    );
    const archivo = new File(['x'], 'mal.exe', { type: 'application/octet-stream' });
    if (input) {
      Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
      input.dispatchEvent(new Event('change'));
    }
    fixture.detectChanges();

    expect(fixture.componentInstance.foto()).toBeNull();
    expect(texto()).toContain('jpg, png o webp de máximo 5 MB');
  });

  it('una foto válida queda lista para el multipart', async () => {
    responderInicio();
    await ceder();

    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type=file]',
    );
    const archivo = new File(['x'], 'repuesto.png', { type: 'image/png' });
    if (input) {
      Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
      input.dispatchEvent(new Event('change'));
    }
    fixture.detectChanges();

    expect(fixture.componentInstance.foto()?.name).toBe('repuesto.png');
    expect(texto()).toContain('Foto lista: repuesto.png');
    expect(texto()).not.toContain('jpg, png o webp');
  });
});
