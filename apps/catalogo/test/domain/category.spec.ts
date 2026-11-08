import { Category } from '../../src/domain/entities/category';

describe('Category (dominio)', () => {
  it('createSeed nace activa y sin id (todavia no persistida)', () => {
    const category = Category.createSeed('Frenos', 'brake');

    expect(category.id).toBeNull();
    expect(category.name).toBe('Frenos');
    expect(category.icon).toBe('brake');
    expect(category.active).toBe(true);
  });

  it('create nace activa y sin id', () => {
    const category = Category.create('Motor', 'repuestos de motor', 'settings');

    expect(category.id).toBeNull();
    expect(category.active).toBe(true);
    expect(category.description).toBe('repuestos de motor');
  });

  it('withEdits conserva id y estado activo, cambia nombre/descripcion/icono', () => {
    const existing = new Category(5, 'Frenos', null, 'brake', true, new Date());

    const edited = existing.withEdits('Frenos y pastillas', 'nueva descripcion', 'brake_2');

    expect(edited.id).toBe(5);
    expect(edited.active).toBe(true);
    expect(edited.name).toBe('Frenos y pastillas');
    expect(edited.description).toBe('nueva descripcion');
    expect(edited.icon).toBe('brake_2');
  });

  it('toggled invierte active y conserva el resto', () => {
    const active = new Category(1, 'Frenos', null, 'brake', true, new Date());

    const inactive = active.toggled();
    expect(inactive.active).toBe(false);
    expect(inactive.name).toBe('Frenos');

    const activeAgain = inactive.toggled();
    expect(activeAgain.active).toBe(true);
  });
});
