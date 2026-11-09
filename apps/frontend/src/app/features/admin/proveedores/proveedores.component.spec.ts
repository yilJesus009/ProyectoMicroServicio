import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { AdminProveedoresComponent } from './proveedores.component';

const ADMIN_URL = `${environment.apiUrl}/admin/suppliers`;
const CATEGORIAS_URL = `${environment.apiUrl}/admin/categories`;

const PERFIL = {
  id: 55,
  user_id: 7,
  business_name: 'AutoParts Center',
  city: 'Santa Cruz',
  phone: '70000000',
  category_ids: [1],
  status: 'PENDING' as const,
  rejection_reason: null,
  reviewed_by: null,
  reviewed_at: null,
  created_at: '2026-11-08T12:00:00Z',
  updated_at: '2026-11-08T12:00:00Z',
};

const CATEGORIAS = [
  { id: 1, name: 'Frenos', description: null, icon: 'brake', active: true },
];

describe('AdminProveedoresComponent', () => {
  let fixture: ComponentFixture<AdminProveedoresComponent>;
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

  /** Responde la carga inicial (perfiles pendientes + categorías). */
  function responderInicio(): void {
    http.expectOne(`${ADMIN_URL}?status=PENDING`).flush({
      status: 200,
      msg: 'Perfiles de proveedores',
      data: [PERFIL],
    });
    http.expectOne(CATEGORIAS_URL).flush({ status: 200, msg: 'Operación exitosa', data: CATEGORIAS });
  }

  /** Responde la recarga que sigue a una decisión (aprobar/rechazar/filtro). */
  function responderRecarga(): void {
    http
      .expectOne(`${ADMIN_URL}?status=PENDING`)
      .flush({ status: 200, msg: 'Perfiles de proveedores', data: [] });
    http.expectOne(CATEGORIAS_URL).flush({ status: 200, msg: 'Operación exitosa', data: CATEGORIAS });
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminProveedoresComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminProveedoresComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('carga los perfiles pendientes con su estado y sus categorías', async () => {
    responderInicio();
    await ceder();

    expect(texto()).toContain('AutoParts Center');
    expect(texto()).toContain('Santa Cruz · 70000000');
    expect(texto()).toContain('Pendiente de aprobación');
    expect(texto()).toContain('Frenos');
  });

  it('aprobar hace POST al endpoint y recarga la lista', async () => {
    responderInicio();
    await ceder();

    boton('Aprobar').click();
    fixture.detectChanges();

    const req = http.expectOne(`${ADMIN_URL}/55/approve`);
    expect(req.request.method).toBe('POST');
    req.flush({ status: 200, msg: 'Proveedor aprobado', data: { ...PERFIL, status: 'APPROVED' } });

    await ceder();
    responderRecarga();
    await ceder();

    expect(texto()).toContain('AutoParts Center quedó aprobado.');
  });

  it('sin motivo de rechazo no se manda nada y se marca el campo', async () => {
    responderInicio();
    await ceder();

    boton('Rechazar').click();
    fixture.detectChanges();
    boton('Confirmar rechazo').click();
    fixture.detectChanges();

    http.expectNone(`${ADMIN_URL}/55/reject`);
    expect(texto()).toContain('Escribe el motivo del rechazo');
  });

  it('rechazar manda el motivo como `reason` (nombre del contrato)', async () => {
    responderInicio();
    await ceder();

    boton('Rechazar').click();
    fixture.detectChanges();

    const area = (fixture.nativeElement as HTMLElement).querySelector('textarea');
    if (area) {
      area.value = 'Datos incompletos';
      area.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
    boton('Confirmar rechazo').click();
    fixture.detectChanges();

    const req = http.expectOne(`${ADMIN_URL}/55/reject`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reason: 'Datos incompletos' });
    req.flush({
      status: 200,
      msg: 'Proveedor rechazado',
      data: { ...PERFIL, status: 'REJECTED', rejection_reason: 'Datos incompletos' },
    });

    await ceder();
    responderRecarga();
    await ceder();

    expect(texto()).toContain('AutoParts Center quedó rechazado.');
  });

  it('al pasar el filtro a Todos pide la lista sin query param', async () => {
    responderInicio();
    await ceder();

    fixture.componentInstance.cambiarFiltro('');

    http.expectOne(ADMIN_URL).flush({ status: 200, msg: 'Perfiles de proveedores', data: [PERFIL] });
    http.expectOne(CATEGORIAS_URL).flush({ status: 200, msg: 'Operación exitosa', data: CATEGORIAS });
    await ceder();

    expect(texto()).toContain('AutoParts Center');
  });
});
