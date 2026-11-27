import { ToggleCategoryCommand } from '../../src/application/commands/toggle-category.command';
import { Category } from '../../src/domain/entities/category';
import { CategoryNotFoundError } from '../../src/domain/errors/category-not-found.error';
import { CategoryRepository } from '../../src/domain/repositories/category.repository';

describe('ToggleCategoryCommand', () => {
  it('desactiva una categoria activa', async () => {
    const existing = new Category(1, 'Frenos', null, 'brake', true, new Date());
    const repo = {
      findById: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockResolvedValue(undefined),
    } as unknown as CategoryRepository;

    const result = await new ToggleCategoryCommand(repo).execute(1);

    expect(result.active).toBe(false);
    expect(repo.update).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
  });

  it('lanza CategoryNotFoundError si no existe (-> 404)', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null) } as unknown as CategoryRepository;

    await expect(new ToggleCategoryCommand(repo).execute(999)).rejects.toThrow(CategoryNotFoundError);
  });
});
