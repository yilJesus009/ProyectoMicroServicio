import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pedido } from '../../facades/pedidos.facade';
import { OrderCardComponent } from './order-card.component';

const PEDIDO: Pedido = {
  id: 12,
  offer_id: 78,
  part_request_id: 34,
  buyer_id: 7,
  supplier_id: 55,
  supplier_name: 'AutoParts Center',
  part_description: 'Amortiguador delantero derecho',
  vehicle_label: 'Toyota Corolla 2018',
  price: 620,
  currency: 'BOB',
  delivery_type: 'DELIVERY',
  estimated_days: 2,
  status: 'PENDING_PAYMENT',
  payment: null,
  history: [],
  created_at: '2026-11-10T14:00:00Z',
};

describe('OrderCardComponent', () => {
  let fixture: ComponentFixture<OrderCardComponent>;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function boton(): HTMLButtonElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('button');
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderCardComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(OrderCardComponent);
  });

  it('muestra repuesto, proveedor, precio y datos del pedido', () => {
    fixture.componentRef.setInput('pedido', PEDIDO);
    fixture.detectChanges();

    expect(texto()).toContain('Amortiguador delantero derecho');
    expect(texto()).toContain('AutoParts Center');
    expect(texto()).toContain('620.00');
    expect(texto()).toContain('BOB');
    expect(texto()).toContain('Toyota Corolla 2018');
    expect(texto()).toContain('Entrega a domicilio');
    expect(texto()).toContain('2 día(s)');
  });

  it('etiqueta el estado en español', () => {
    fixture.componentRef.setInput('pedido', { ...PEDIDO, status: 'IN_TRANSIT' });
    fixture.detectChanges();
    expect(texto()).toContain('En camino');

    fixture.componentRef.setInput('pedido', { ...PEDIDO, status: 'READY_FOR_PICKUP' });
    fixture.detectChanges();
    expect(texto()).toContain('Listo para retiro');
  });

  it('sin acción no muestra botón', () => {
    fixture.componentRef.setInput('pedido', PEDIDO);
    fixture.detectChanges();

    expect(boton()).toBeNull();
  });

  it('con acción muestra el botón y avisa al hacer clic', () => {
    fixture.componentRef.setInput('pedido', { ...PEDIDO, status: 'PREPARING' });
    fixture.componentRef.setInput('accion', 'Marcar en camino');

    let aviso = 0;
    fixture.componentInstance.accionEmitida.subscribe(() => aviso++);

    fixture.detectChanges();

    expect(boton()?.textContent?.trim()).toBe('Marcar en camino');
    boton()?.click();
    expect(aviso).toBe(1);
  });
});
