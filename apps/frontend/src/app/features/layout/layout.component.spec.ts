import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthFacade } from '../../facades/auth.facade';
import { routes } from '../../app.routes';
import { Usuario } from '../../core/auth/session.model';
import { LayoutComponent } from './layout.component';

function usuario(rol: Usuario['rol']): Usuario {
  return {
    id: 1,
    nombre: 'Persona de Prueba',
    email: 'persona@repuestosya.com',
    telefono: null,
    ciudad: 'Santa Cruz',
    rol,
  };
}

describe('LayoutComponent', () => {
  let fixture: ComponentFixture<LayoutComponent>;
  let facade: AuthFacade;
  let router: Router;

  function etiquetasDelMenu(): string[] {
    const items = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.item-menu .item-menu__etiqueta',
    );
    return Array.from(items).map((item) => item.textContent?.trim() ?? '');
  }

  function boton(texto: string): HTMLButtonElement {
    const botones = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    const encontrado = Array.from(botones).find((b) => b.textContent?.includes(texto));
    if (!encontrado) throw new Error(`No existe el botón ${texto}`);
    return encontrado;
  }

  async function montar(rol: Usuario['rol']): Promise<void> {
    localStorage.setItem('repuestosya_token', 'tok');
    localStorage.setItem('repuestosya_usuario', JSON.stringify(usuario(rol)));
    facade.sesion.set({ token: 'tok', expiraEn: 3600, usuario: usuario(rol) });

    fixture = TestBed.createComponent(LayoutComponent);
    fixture.detectChanges();

    // No se usa whenStable() aquí: la campanita del layout tiene un
    // intervalo de 15 s que mantiene inestable la zona de Angular, y
    // whenStable() nunca resolvería. Ceder el turno a las microtareas
    // alcanza para asentar la sesión y el menú.
    for (let i = 0; i < 20; i++) {
      await Promise.resolve();
    }
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    }).compileComponents();

    facade = TestBed.inject(AuthFacade);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    localStorage.clear();
    fixture?.destroy();
  });

  it('muestra quién es en la barra superior', async () => {
    await montar('COMPRADOR');

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Persona de Prueba');
    expect(texto).toContain('Comprador');

    // El título de marca de la barra superior es el logo (DISEÑO.md sección
    // 3: el logo lleva alt="RepuestosYa"), no un texto literal.
    const logo = (fixture.nativeElement as HTMLElement).querySelector(
      '.logo-barra',
    ) as HTMLImageElement;
    expect(logo?.alt).toBe('RepuestosYa');
  });

  it('al comprador le muestra SU menú y no el de los demás', async () => {
    await montar('COMPRADOR');
    const menu = etiquetasDelMenu();

    expect(menu).toEqual(['Mis solicitudes', 'Nueva solicitud', 'Mis pedidos', 'Mis vehículos']);
    expect(menu).not.toContain('Categorías');
    expect(menu).not.toContain('Mis ofertas');
  });

  it('al proveedor le muestra SU menú y no el del comprador', async () => {
    await montar('PROVEEDOR');
    const menu = etiquetasDelMenu();

    expect(menu).toEqual([
      'Perfil comercial',
      'Solicitudes abiertas',
      'Mis ofertas',
      'Mis pedidos',
    ]);
    expect(menu).not.toContain('Nueva solicitud');
  });

  it('al admin le muestra SU menú y no el de los demás', async () => {
    await montar('ADMIN');
    const menu = etiquetasDelMenu();

    expect(menu).toEqual(['Proveedores pendientes', 'Categorías']);
    expect(menu).not.toContain('Mis solicitudes');
    expect(menu).not.toContain('Perfil comercial');
  });

  it('Salir cierra la sesión y vuelve al login', async () => {
    await montar('ADMIN');

    boton('Salir').click();
    fixture.detectChanges();

    expect(facade.autenticado()).toBeFalse();
    expect(localStorage.getItem('repuestosya_token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('alternar() cambia el estado abierto del menú lateral', async () => {
    // El botón que llama a alternar() solo se muestra en ancho de móvil/
    // tablet (sección 8 de DISEÑO.md: en escritorio el menú queda fijo), así
    // que la prueba llama al método directamente en vez de buscar el botón
    // por su rótulo, que ahora es un ícono.
    await montar('COMPRADOR');

    const abiertoInicial = fixture.componentInstance['abierto']();

    fixture.componentInstance.alternar();
    fixture.detectChanges();
    expect(fixture.componentInstance['abierto']()).toBe(!abiertoInicial);

    fixture.componentInstance.alternar();
    fixture.detectChanges();
    expect(fixture.componentInstance['abierto']()).toBe(abiertoInicial);
  });
});
