import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstadoPerfilComponent } from './estado-perfil.component';

describe('EstadoPerfilComponent', () => {
  let fixture: ComponentFixture<EstadoPerfilComponent>;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EstadoPerfilComponent] }).compileComponents();
    fixture = TestBed.createComponent(EstadoPerfilComponent);
  });

  it('muestra la etiqueta en español de un perfil pendiente', () => {
    fixture.componentRef.setInput('estado', 'PENDING');
    fixture.detectChanges();

    expect(texto()).toContain('Pendiente de aprobación');
    expect(texto()).not.toContain('Motivo');
  });

  it('muestra la etiqueta de un perfil aprobado', () => {
    fixture.componentRef.setInput('estado', 'APPROVED');
    fixture.detectChanges();

    expect(texto()).toContain('Aprobado');
  });

  it('muestra el motivo solo cuando el estado es REJECTED', () => {
    fixture.componentRef.setInput('estado', 'REJECTED');
    fixture.componentRef.setInput('motivo', 'Datos incompletos');
    fixture.detectChanges();

    expect(texto()).toContain('Rechazado');
    expect(texto()).toContain('Motivo: Datos incompletos');
  });
});
