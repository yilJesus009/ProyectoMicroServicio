import { Category } from '../../domain/entities/category';
import { CategoryOrmEntity } from './category.orm-entity';

/** Traduce entre la entidad de dominio (pura) y la entidad de TypeORM. */
export class CategoryMapper {
  static toDomain(orm: CategoryOrmEntity): Category {
    return new Category(orm.id, orm.name, orm.description, orm.icon, orm.active, orm.createdAt);
  }

  static toOrm(category: Category): CategoryOrmEntity {
    const orm = new CategoryOrmEntity();
    if (category.id !== null) orm.id = category.id;
    orm.name = category.name;
    orm.description = category.description;
    orm.icon = category.icon;
    orm.active = category.active;
    return orm;
  }
}
