import { ListAllCategoriesQuery } from '../../src/application/queries/list-all-categories.query';
import { Category } from '../../src/domain/entities/category';
import { CategoryRepository } from '../../src/domain/repositories/category.repository';

describe('ListAllCategoriesQuery', () => {
  it('devuelve todas, incluidas las inactivas', async () => {
    const list = [
      new Category(1, 'Frenos', null, 'brake', true, new Date()),
      new Category(2, 'Motor', null, 'settings', false, new Date()),
    ];
    const repo = { findAll: jest.fn().mockResolvedValue(list) } as unknown as CategoryRepository;

    const result = await new ListAllCategoriesQuery(repo).execute();

    expect(result).toBe(list);
    expect(result.some((c) => !c.active)).toBe(true);
  });
});
