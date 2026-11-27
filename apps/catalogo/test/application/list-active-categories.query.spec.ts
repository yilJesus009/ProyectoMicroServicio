import { ListActiveCategoriesQuery } from '../../src/application/queries/list-active-categories.query';
import { Category } from '../../src/domain/entities/category';
import { CategoryRepository } from '../../src/domain/repositories/category.repository';

describe('ListActiveCategoriesQuery', () => {
  it('devuelve solo lo que entrega el repositorio (categorias activas)', async () => {
    const active = [new Category(1, 'Frenos', null, 'brake', true, new Date())];
    const repo = { findActive: jest.fn().mockResolvedValue(active) } as unknown as CategoryRepository;

    const result = await new ListActiveCategoriesQuery(repo).execute();

    expect(result).toBe(active);
    expect(repo.findActive).toHaveBeenCalledTimes(1);
  });
});
