import { GetCategoryByIdQuery } from '../../src/application/queries/get-category-by-id.query';
import { Category } from '../../src/domain/entities/category';
import { CategoryNotFoundError } from '../../src/domain/errors/category-not-found.error';
import { CategoryRepository } from '../../src/domain/repositories/category.repository';

describe('GetCategoryByIdQuery', () => {
  it('devuelve la categoria cuando existe', async () => {
    const found = new Category(1, 'Frenos', null, 'brake', true, new Date());
    const repo = { findById: jest.fn().mockResolvedValue(found) } as unknown as CategoryRepository;

    const result = await new GetCategoryByIdQuery(repo).execute(1);

    expect(result).toBe(found);
  });

  it('lanza CategoryNotFoundError si no existe (-> 404)', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null) } as unknown as CategoryRepository;

    await expect(new GetCategoryByIdQuery(repo).execute(999)).rejects.toThrow(CategoryNotFoundError);
  });
});
