import { AdminCategoriesController } from '../../src/presentation/http/admin-categories.controller';
import { ListAllCategoriesQuery } from '../../src/application/queries/list-all-categories.query';
import { CreateCategoryCommand } from '../../src/application/commands/create-category.command';
import { UpdateCategoryCommand } from '../../src/application/commands/update-category.command';
import { ToggleCategoryCommand } from '../../src/application/commands/toggle-category.command';
import { Category } from '../../src/domain/entities/category';

function buildController(overrides: {
  listAll?: Partial<ListAllCategoriesQuery>;
  create?: Partial<CreateCategoryCommand>;
  update?: Partial<UpdateCategoryCommand>;
  toggle?: Partial<ToggleCategoryCommand>;
}) {
  return new AdminCategoriesController(
    (overrides.listAll ?? {}) as ListAllCategoriesQuery,
    (overrides.create ?? {}) as CreateCategoryCommand,
    (overrides.update ?? {}) as UpdateCategoryCommand,
    (overrides.toggle ?? {}) as ToggleCategoryCommand,
  );
}

describe('AdminCategoriesController', () => {
  it('GET /admin/categories devuelve todas, incluidas inactivas', async () => {
    const list = [new Category(1, 'Frenos', null, 'brake', false, new Date())];
    const controller = buildController({ listAll: { execute: jest.fn().mockResolvedValue(list) } });

    const res = await controller.findAll();

    expect(res).toEqual({ status: 200, msg: 'Operación exitosa', data: list });
  });

  it('POST /admin/categories responde 201 al crear', async () => {
    const created = new Category(1, 'Motor', null, 'settings', true, new Date());
    const controller = buildController({ create: { execute: jest.fn().mockResolvedValue(created) } });

    const res = await controller.createOne({ name: 'Motor' });

    expect(res).toEqual({ status: 201, msg: 'Categoría creada', data: created });
  });

  it('PUT /admin/categories/:id responde con la categoria editada', async () => {
    const updated = new Category(1, 'Frenos y pastillas', null, 'brake', true, new Date());
    const controller = buildController({ update: { execute: jest.fn().mockResolvedValue(updated) } });

    const res = await controller.updateOne(1, { name: 'Frenos y pastillas' });

    expect(res).toEqual({ status: 200, msg: 'Categoría actualizada', data: updated });
  });

  it('PATCH /admin/categories/:id/toggle responde con el nuevo estado', async () => {
    const toggled = new Category(1, 'Frenos', null, 'brake', false, new Date());
    const controller = buildController({ toggle: { execute: jest.fn().mockResolvedValue(toggled) } });

    const res = await controller.toggleOne(1);

    expect(res).toEqual({ status: 200, msg: 'Estado actualizado', data: toggled });
  });
});
