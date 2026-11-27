import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Solicitud } from '../../facades/solicitudes.facade';
import { TarjetaSolicitudComponent } from './tarjeta-solicitud.component';

const SOLICITUD: Solicitud = {
  id: 34,
  user_id: 7,
  category_id: 1,
  category_name: 'Frenos',
  vehicle_label: 'Toyota Corolla 2018',
  description: 'Pastillas de freno delanteras',
  city: 'Santa Cruz',
  urgency: 'ALTA',
  status: 'PUBLISHED',
  photo: null,
  created_at: '2026-11-08T12:00:00Z',
};

describe('TarjetaSolicitudComponent', () => {
  let fixture: ComponentFixture<TarjetaSolicitudComponent>;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TarjetaSolicitudComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TarjetaSolicitudComponent);
  });

  it('muestra descripción, estado en español y vehículo etiquetado', () => {
    fixture.componentRef.setInput('solicitud', SOLICITUD);
    fixture.detectChanges();

    expect(texto()).toContain('Pastillas de freno delanteras');
    expect(texto()).toContain('Publicada');
    expect(texto()).toContain('Toyota Corolla 2018');
    expect(texto()).toContain('Frenos');
    expect(texto()).toContain('Santa Cruz');
    expect(texto()).toContain('Urgencia alta');
  });

  it('arma la etiqueta del vehículo con marca, modelo y año si no viene label', () => {
    fixture.componentRef.setInput('solicitud', {
      ...SOLICITUD,
      vehicle_label: undefined,
      vehicle_brand: 'Toyota',
      vehicle_model: 'Corolla',
      vehicle_year: 2018,
    });
    fixture.detectChanges();

    expect(texto()).toContain('Toyota Corolla 2018');
  });

  it('avisa cuando la solicitud no trae datos del vehículo', () => {
    fixture.componentRef.setInput('solicitud', {
      ...SOLICITUD,
      vehicle_label: undefined,
      vehicle_brand: undefined,
      vehicle_model: undefined,
      vehicle_year: undefined,
    });
    fixture.detectChanges();

    expect(texto()).toContain('Vehículo no especificado');
  });

  it('muestra la fecha en formato dd/MM/yyyy', () => {
    fixture.componentRef.setInput('solicitud', SOLICITUD);
    fixture.detectChanges();

    expect(texto()).toContain('08/11/2026');
  });
});
