import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { Aviso } from '../../facades/notificaciones.facade';
import { CampanitaComponent } from './campanita.component';

const CONTEO_URL = `${environment.apiUrl}/notifications/unread-count`;
const MINE_URL = `${environment.apiUrl}/notifications/mine`;
const LEER_URL = `${environment.apiUrl}/notifications/12/read`;
const LEER_TODAS_URL = `${environment.apiUrl}/notifications/read-all`;

const AVISO: Aviso = {
  id: 12,
  type: 'SUPPLIER_APPROVED',
  title: 'Perfil aprobado',
  message: 'Tu perfil comercial fue aprobado',
  link: '/proveedor/solicitudes',
  read: false,
  created_at: '2026-11-08T12:00:00Z',
};

describe('CampanitaComponent', () => {
  let http: HttpTestingController;
  let router: Router;

  async function ceder(
    fixture: ComponentFixture<CampanitaComponent>,
    veces = 20,
  ): Promise<void> {
    for (let i = 0; i < veces; i++) {
      await Promise.resolve();
    }
    fixture.detectChanges();
  }

  function montar(): ComponentFixture<CampanitaComponent> {
    const fixture = TestBed.createComponent(CampanitaComponent);
    fixture.detectChanges(); // ngOnInit → primer conteo + intervalo de 15 s
    return fixture;
  }

  function elemento(fixture: ComponentFixture<CampanitaComponent>, selector: string) {
    return (fixture.nativeElement as HTMLElement).querySelector(selector);
  }

  /** Responde el conteo inicial que pide ngOnInit. */
  function responderConteo(count: number): void {
    http
      .expectOne(CONTEO_URL)
      .flush({ status: 200, msg: 'Conteo de avisos sin leer', data: { count } });
  }

  /** Abre el panel y deja su lista cargada. */
  async function abrirPanel(
    fixture: ComponentFixture<CampanitaComponent>,
    avisos: Aviso[] = [AVISO],
  ): Promise<void> {
    elemento(fixture, '.campanita-boton')?.dispatchEvent(new Event('click'));
    fixture.detectChanges();
    http.expectOne(MINE_URL).flush({ status: 200, msg: 'Avisos encontrados', data: avisos });
    await ceder(fixture);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampanitaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => http.verify());

  it('muestra el contador de avisos sin leer en la campanita', async () => {
    const fixture = montar();
    responderConteo(3);
    await ceder(fixture);

    expect(elemento(fixture, '.conteo')?.textContent?.trim()).toBe('3');
  });

  it('con cero avisos no muestra el badge', async () => {
    const fixture = montar();
    responderConteo(0);
    await ceder(fixture);

    expect(elemento(fixture, '.conteo')).toBeNull();
  });

  it('al abrir la campanita lista los avisos', async () => {
    const fixture = montar();
    responderConteo(1);
    await ceder(fixture);

    await abrirPanel(fixture);

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Perfil aprobado');
    expect(texto).toContain('Tu perfil comercial fue aprobado');
    expect(texto).toContain('Marcar todas como leídas');
  });

  it('al hacer clic en un aviso navega a su link y lo marca como leído', async () => {
    const fixture = montar();
    responderConteo(1);
    await ceder(fixture);
    await abrirPanel(fixture);

    elemento(fixture, '.aviso')?.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/proveedor/solicitudes']);

    const req = http.expectOne(LEER_URL);
    expect(req.request.method).toBe('PATCH');
    req.flush({ status: 200, msg: 'Aviso marcado como leído', data: null });

    await ceder(fixture);
    responderConteo(0);
    await ceder(fixture);

    // El panel se cierra y el contador queda en cero.
    expect(elemento(fixture, '.panel')).toBeNull();
    expect(elemento(fixture, '.conteo')).toBeNull();
  });

  it('marcar todas como leídas limpia el contador', async () => {
    const fixture = montar();
    responderConteo(2);
    await ceder(fixture);
    await abrirPanel(fixture, [AVISO, { ...AVISO, id: 13, title: 'Oferta recibida' }]);

    elemento(fixture, '.todas')?.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    const req = http.expectOne(LEER_TODAS_URL);
    expect(req.request.method).toBe('PATCH');
    req.flush({ status: 200, msg: 'Avisos marcados como leídos', data: null });

    await ceder(fixture);
    responderConteo(0);
    await ceder(fixture);

    expect(elemento(fixture, '.conteo')).toBeNull();
    expect(elemento(fixture, '.panel')).not.toBeNull();
  });

  it('vuelve a consultar el contador cada 15 segundos', fakeAsync(() => {
    const fixture = montar();
    responderConteo(0);
    flushMicrotasks();

    tick(15_000);
    responderConteo(4);
    flushMicrotasks();

    fixture.detectChanges();
    expect(fixture.componentInstance.conteo()).toBe(4);
    expect(elemento(fixture, '.conteo')?.textContent?.trim()).toBe('4');

    // Zona falsa de zone.js: al terminar el test drena la cola con
    // flush(20, true) y volvería a disparar el intervalo ya reprogramado
    // (t = 30 s), lo que dejaría una petición sin responder y haría fallar
    // http.verify(). Destruir el fixture limpia el intervalo en
    // ngOnDestroy, igual que haría el desmontaje real en el layout.
    fixture.destroy();
  }));
});
