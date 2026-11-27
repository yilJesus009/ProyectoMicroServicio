import { UpdateCategoryCommand } from '../../src/application/commands/update-category.command';
import { Category } from '../../src/domain/entities/category';
import { CategoryNotFoundError } from '../../src/domain/errors/category-not-found.error';
import { CategoryNameConflictError } from '../../src/domain/errors/category-name-conflict.error';
import { CategoryRepository } from '../../src/domain/repositories/category.repository';

describe('UpdateCategoryCommand', () => {
  it('edita cuando existe y el nombre nuevo esta libre', async () => {
    const existing = new Category(1, 'Frenos', null, 'brake', true, new Date());
    const repo = {
      findById: jest.fn().mockResolvedValue(existing),
      findByNameInsensitive: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(undefined),
    } as unknown as CategoryRepository;

    const result = await new UpdateCategoryCommand(repo).execute(1, { name: 'Frenos y pastillas' });

    expect(result.name).toBe('Frenos y pastillas');
    expect(repo.update).toHaveBeenCalled();
  });

  it('lanza CategoryNotFoundError si no existe (-> 404)', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null) } as unknown as CategoryRepository;

    await expect(new UpdateCategoryCommand(repo).execute(999, { name: 'X' })).rejects.toThrow(
      CategoryNotFoundError,
    );
  });

  it('lanza CategoryNameConflictError si el nuevo nombre choca con otra (sin importar mayusculas), excluyendose a si misma', async () => {
    const existing = new Category(1, 'Frenos', null, 'brake', true, new Date());
    const other = new Category(2, 'Motor', null, 'settings', true, new Date());
    const repo = {
      findById: jest.fn().mockResolvedValue(existing),
      findByNameInsensitive: jest.fn().mockResolvedValue(other),
      update: jest.fn(),
    } as unknown as CategoryRepository;

    await expect(new UpdateCategoryCommand(repo).execute(1, { name: 'motor' })).rejects.toThrow(
      CategoryNameConflictError,
    );
    expect(repo.findByNameInsensitive).toHaveBeenCalledWith('motor', 1);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
