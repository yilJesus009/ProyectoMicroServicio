import { CategoriesController } from '../../src/presentation/http/categories.controller';
import { ListActiveCategoriesQuery } from '../../src/application/queries/list-active-categories.query';
import { GetCategoryByIdQuery } from '../../src/application/queries/get-category-by-id.query';
import { Category } from '../../src/domain/entities/category';

describe('CategoriesController', () => {
  it('GET /categories responde con el sobre {status, msg, data}', async () => {
    const list = [new Category(1, 'Frenos', null, 'brake', true, new Date())];
    const listActive = { execute: jest.fn().mockResolvedValue(list) } as unknown as ListActiveCategoriesQuery;
    const getById = {} as GetCategoryByIdQuery;

    const res = await new CategoriesController(listActive, getById).findActive();

    expect(res).toEqual({ status: 200, msg: 'Operación exitosa', data: list });
  });

  it('GET /categories/:id devuelve la categoria en el sobre', async () => {
    const found = new Category(1, 'Frenos', null, 'brake', true, new Date());
    const listActive = {} as ListActiveCategoriesQuery;
    const getById = { execute: jest.fn().mockResolvedValue(found) } as unknown as GetCategoryByIdQuery;

    const res = await new CategoriesController(listActive, getById).findById(1);

    expect(res).toEqual({ status: 200, msg: 'Operación exitosa', data: found });
    expect(getById.execute).toHaveBeenCalledWith(1);
  });
});
