import { CreateCategoryCommand } from '../../src/application/commands/create-category.command';
import { Category } from '../../src/domain/entities/category';
import { CategoryNameConflictError } from '../../src/domain/errors/category-name-conflict.error';
import { CategoryRepository } from '../../src/domain/repositories/category.repository';

describe('CreateCategoryCommand', () => {
  it('crea la categoria cuando el nombre no esta en uso', async () => {
    const saved = new Category(1, 'Motor', null, 'settings', true, new Date());
    const repo = {
      findByNameInsensitive: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(saved),
    } as unknown as CategoryRepository;

    const result = await new CreateCategoryCommand(repo).execute({ name: 'Motor' });

    expect(result).toBe(saved);
    expect(repo.findByNameInsensitive).toHaveBeenCalledWith('Motor');
  });

  it('rechaza con CategoryNameConflictError (-> 409) si ya existe, sin importar mayusculas', async () => {
    const existing = new Category(1, 'Frenos', null, 'brake', true, new Date());
    const repo = {
      findByNameInsensitive: jest.fn().mockResolvedValue(existing),
      save: jest.fn(),
    } as unknown as CategoryRepository;

    await expect(new CreateCategoryCommand(repo).execute({ name: 'frenos' })).rejects.toThrow(
      CategoryNameConflictError,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });
});
