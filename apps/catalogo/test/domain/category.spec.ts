import { Category } from '../../src/domain/entities/category';

describe('Category (dominio)', () => {
  it('createSeed nace activa y sin id (todavia no persistida)', () => {
    const category = Category.createSeed('Frenos', 'brake');

    expect(category.id).toBeNull();
    expect(category.name).toBe('Frenos');
    expect(category.icon).toBe('brake');
    expect(category.active).toBe(true);
  });
});
