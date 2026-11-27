import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { Category } from '../../domain/entities/category';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found.error';

@Injectable()
export class GetCategoryByIdQuery {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(id: number): Promise<Category> {
    const category = await this.categories.findById(id);
    if (!category) throw new CategoryNotFoundError(id);
    return category;
  }
}
