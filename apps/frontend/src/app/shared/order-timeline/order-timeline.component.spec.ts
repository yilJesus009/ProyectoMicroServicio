import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntradaHistorial } from '../../facades/pedidos.facade';
import { OrderTimelineComponent } from './order-timeline.component';

const HISTORIAL: EntradaHistorial[] = [
  { from_status: null, to_status: 'PENDING_PAYMENT', changed_at: '2026-11-10T14:00:00Z' },
  { from_status: 'PENDING_PAYMENT', to_status: 'PREPARING', changed_at: '2026-11-10T14:05:00Z' },
  { from_status: 'PREPARING', to_status: 'IN_TRANSIT', changed_at: '2026-11-10T15:00:00Z' },
];

describe('OrderTimelineComponent', () => {
  let fixture: ComponentFixture<OrderTimelineComponent>;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function items(): HTMLLIElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('li'));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderTimelineComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(OrderTimelineComponent);
  });

  it('lista el historial en orden cronológico con los textos en español', () => {
    fixture.componentRef.setInput('historial', HISTORIAL);
    fixture.detectChanges();

    expect(texto()).toContain('Pendiente de pago');
    expect(texto()).toContain('Preparando');
    expect(texto()).toContain('En camino');

    const etiquetas = items().map((li) => li.querySelector('.estado')?.textContent?.trim());
    expect(etiquetas).toEqual(['Pendiente de pago', 'Preparando', 'En camino']);
  });

  it('resalta la última entrada como estado actual', () => {
    fixture.componentRef.setInput('historial', HISTORIAL);
    fixture.detectChanges();

    const marcados = items().filter((li) => li.classList.contains('actual'));
    expect(marcados.length).toBe(1);
    expect(marcados[0].textContent).toContain('En camino');
  });

  it('sin historial muestra el mensaje vacío', () => {
    fixture.componentRef.setInput('historial', []);
    fixture.detectChanges();

    expect(texto()).toContain('Sin movimientos todavía.');
  });
});
