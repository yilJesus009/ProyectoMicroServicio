import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Oferta } from '../../facades/solicitudes.facade';
import { OfferCardComponent } from './offer-card.component';

const OFERTA: Oferta = {
  id: 78,
  part_request_id: 34,
  supplier_id: 55,
  supplier_name: 'AutoParts Center',
  price: 620,
  currency: 'BOB',
  brand: 'KYB',
  condition: 'NEW',
  availability: 'IN_STOCK',
  delivery_type: 'DELIVERY',
  estimated_days: 2,
  notes: null,
  status: 'SUBMITTED',
  created_at: '2026-11-10T14:00:00Z',
};

describe('OfferCardComponent', () => {
  let fixture: ComponentFixture<OfferCardComponent>;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function boton(): HTMLButtonElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('button');
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfferCardComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(OfferCardComponent);
  });

  it('muestra proveedor, precio con moneda y datos de la oferta', () => {
    fixture.componentRef.setInput('oferta', OFERTA);
    fixture.detectChanges();

    expect(texto()).toContain('AutoParts Center');
    expect(texto()).toContain('620.00');
    expect(texto()).toContain('BOB');
    expect(texto()).toContain('KYB');
    expect(texto()).toContain('Nuevo');
    expect(texto()).toContain('En stock');
    expect(texto()).toContain('Entrega a domicilio');
    expect(texto()).toContain('2 día(s)');
    expect(texto()).toContain('Enviada');
  });

  it('sin acción no muestra botón', () => {
    fixture.componentRef.setInput('oferta', OFERTA);
    fixture.detectChanges();

    expect(boton()).toBeNull();
  });

  it('con acción muestra el botón con su etiqueta y avisa al hacer clic', () => {
    fixture.componentRef.setInput('oferta', OFERTA);
    fixture.componentRef.setInput('accion', 'Aceptar oferta');
    fixture.componentRef.setInput('esAceptar', true);

    let aviso = 0;
    fixture.componentInstance.accionEmitida.subscribe(() => aviso++);

    fixture.detectChanges();

    expect(boton()?.textContent?.trim()).toBe('Aceptar oferta');
    boton()?.click();
    expect(aviso).toBe(1);
  });

  it('muestra las notas si las trae', () => {
    fixture.componentRef.setInput('oferta', { ...OFERTA, notes: 'Pieza original, 1 año de garantía' });
    fixture.detectChanges();

    expect(texto()).toContain('Pieza original, 1 año de garantía');
  });

  it('etiqueta los estados en español', () => {
    fixture.componentRef.setInput('oferta', { ...OFERTA, status: 'REJECTED' });
    fixture.detectChanges();
    expect(texto()).toContain('No elegida');

    fixture.componentRef.setInput('oferta', { ...OFERTA, status: 'WITHDRAWN' });
    fixture.detectChanges();
    expect(texto()).toContain('Retirada');
  });
});
