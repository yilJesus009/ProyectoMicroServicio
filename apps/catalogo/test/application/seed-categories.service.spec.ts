import { SeedCategoriesService } from '../../src/application/seed-categories.service';
import { CategoryRepository } from '../../src/domain/repositories/category.repository';

function makeRepo(): jest.Mocked<CategoryRepository> {
  return {
    count: jest.fn(),
    insertMany: jest.fn(),
    findActive: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<CategoryRepository>;
}

describe('SeedCategoriesService', () => {
  it('si la tabla esta vacia, inserta las 10 categorias fijas', async () => {
    const repo = makeRepo();
    repo.count.mockResolvedValue(0);

    await new SeedCategoriesService(repo).onModuleInit();

    expect(repo.insertMany).toHaveBeenCalledTimes(1);
    const inserted = repo.insertMany.mock.calls[0][0];
    expect(inserted).toHaveLength(10);
    expect(inserted.every((c) => c.active)).toBe(true);
  });

  it('si la tabla ya tiene datos, no inserta nada', async () => {
    const repo = makeRepo();
    repo.count.mockResolvedValue(3);

    await new SeedCategoriesService(repo).onModuleInit();

    expect(repo.insertMany).not.toHaveBeenCalled();
  });
});
