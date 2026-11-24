import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntradaHistorial, EstadoPedido, TipoEntregaPedido } from '../../facades/pedidos.facade';
import { OrderTimelineComponent } from './order-timeline.component';

describe('OrderTimelineComponent', () => {
  let fixture: ComponentFixture<OrderTimelineComponent>;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function pasos(): HTMLLIElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('li.paso'));
  }

  function montar(
    status: EstadoPedido,
    deliveryType: TipoEntregaPedido,
    history: EntradaHistorial[],
  ): void {
    fixture = TestBed.createComponent(OrderTimelineComponent);
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('deliveryType', deliveryType);
    fixture.componentRef.setInput('history', history);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderTimelineComponent],
    }).compileComponents();
  });

  it('muestra los 4 pasos fijos con entrega a domicilio', () => {
    montar('PENDING_PAYMENT', 'DELIVERY', []);

    const etiquetas = pasos().map((li) => li.querySelector('.paso__etiqueta')?.textContent?.trim());
    expect(etiquetas).toEqual(['Pendiente de pago', 'Preparando', 'En camino', 'Entregado']);
  });

  it('con retiro en tienda, el tercer paso es "Listo para retiro"', () => {
    montar('PENDING_PAYMENT', 'PICKUP', []);

    const etiquetas = pasos().map((li) => li.querySelector('.paso__etiqueta')?.textContent?.trim());
    expect(etiquetas).toEqual(['Pendiente de pago', 'Preparando', 'Listo para retiro', 'Entregado']);
  });

  it('marca como actual el paso que coincide con el estado del pedido', () => {
    montar('PREPARING', 'DELIVERY', [
      { from_status: null, to_status: 'PENDING_PAYMENT', changed_at: '2026-11-10T14:00:00Z' },
      { from_status: 'PENDING_PAYMENT', to_status: 'PREPARING', changed_at: '2026-11-10T14:05:00Z' },
    ]);

    const actuales = pasos().filter((li) => li.classList.contains('paso--actual'));
    expect(actuales.length).toBe(1);
    expect(actuales[0].textContent).toContain('Preparando');
  });

  it('marca como completados (no actuales) los pasos anteriores al actual', () => {
    montar('IN_TRANSIT', 'DELIVERY', [
      { from_status: null, to_status: 'PENDING_PAYMENT', changed_at: '2026-11-10T14:00:00Z' },
      { from_status: 'PENDING_PAYMENT', to_status: 'PREPARING', changed_at: '2026-11-10T14:05:00Z' },
      { from_status: 'PREPARING', to_status: 'IN_TRANSIT', changed_at: '2026-11-10T15:00:00Z' },
    ]);

    const completados = pasos().filter((li) => li.classList.contains('paso--completado'));
    expect(completados.map((li) => li.querySelector('.paso__etiqueta')?.textContent?.trim())).toEqual([
      'Pendiente de pago',
      'Preparando',
    ]);
  });

  it('toma la fecha de cada paso alcanzado desde el historial', () => {
    montar('PREPARING', 'DELIVERY', [
      { from_status: null, to_status: 'PENDING_PAYMENT', changed_at: '2026-11-08T14:00:00Z' },
      { from_status: 'PENDING_PAYMENT', to_status: 'PREPARING', changed_at: '2026-11-09T14:05:00Z' },
    ]);

    expect(texto()).toContain('08/11/2026');
    expect(texto()).toContain('09/11/2026');
  });

  it('un paso todavía no alcanzado no muestra fecha', () => {
    montar('PENDING_PAYMENT', 'DELIVERY', [
      { from_status: null, to_status: 'PENDING_PAYMENT', changed_at: '2026-11-08T14:00:00Z' },
    ]);

    const futuro = pasos().find((li) => li.textContent?.includes('Preparando'));
    expect(futuro?.querySelector('time')).toBeNull();
  });

  it('con retiro en tienda, "En camino" no forma parte de los pasos', () => {
    montar('READY_FOR_PICKUP', 'PICKUP', [
      { from_status: null, to_status: 'PENDING_PAYMENT', changed_at: '2026-11-10T14:00:00Z' },
      { from_status: 'PENDING_PAYMENT', to_status: 'PREPARING', changed_at: '2026-11-10T14:05:00Z' },
      { from_status: 'PREPARING', to_status: 'READY_FOR_PICKUP', changed_at: '2026-11-10T15:00:00Z' },
    ]);

    expect(texto()).not.toContain('En camino');
    const actuales = pasos().filter((li) => li.classList.contains('paso--actual'));
    expect(actuales[0].textContent).toContain('Listo para retiro');
  });

  it('un estado que no es ninguno de los 4 pasos (COMPLETED) no rompe el componente', () => {
    montar('COMPLETED', 'DELIVERY', [
      { from_status: null, to_status: 'PENDING_PAYMENT', changed_at: '2026-11-10T14:00:00Z' },
      { from_status: 'PENDING_PAYMENT', to_status: 'PREPARING', changed_at: '2026-11-10T14:05:00Z' },
      { from_status: 'PREPARING', to_status: 'IN_TRANSIT', changed_at: '2026-11-10T15:00:00Z' },
      { from_status: 'IN_TRANSIT', to_status: 'DELIVERED', changed_at: '2026-11-10T16:00:00Z' },
      { from_status: 'DELIVERED', to_status: 'COMPLETED', changed_at: '2026-11-10T17:00:00Z' },
    ]);

    // Los 4 pasos quedan completados (todos se alcanzaron); ninguno es "actual",
    // porque COMPLETED no es uno de los 4 pasos fijos.
    expect(pasos().filter((li) => li.classList.contains('paso--completado')).length).toBe(4);
    expect(pasos().filter((li) => li.classList.contains('paso--actual')).length).toBe(0);

    // El estado real se muestra aparte, en tono neutro, sin romper el stepper.
    expect(texto()).toContain('Estado actual:');
    expect(texto()).toContain('Completada');
    const insignia = (fixture.nativeElement as HTMLElement).querySelector('.estado--neutro');
    expect(insignia?.textContent?.trim()).toBe('Completada');
  });

  it('cuando el estado sí es uno de los 4 pasos no muestra el texto de "estado actual"', () => {
    montar('DELIVERED', 'DELIVERY', [
      { from_status: 'IN_TRANSIT', to_status: 'DELIVERED', changed_at: '2026-11-10T16:00:00Z' },
    ]);

    expect(texto()).not.toContain('Estado actual:');
  });
});
