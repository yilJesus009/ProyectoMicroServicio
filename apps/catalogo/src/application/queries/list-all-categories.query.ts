import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { Category } from '../../domain/entities/category';

/** Admin: todas las categorias, incluidas las inactivas. */
@Injectable()
export class ListAllCategoriesQuery {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(): Promise<Category[]> {
    return this.categories.findAll();
  }
}
