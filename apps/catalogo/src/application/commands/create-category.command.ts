import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { Category } from '../../domain/entities/category';
import { CategoryNameConflictError } from '../../domain/errors/category-name-conflict.error';

export interface CreateCategoryInput {
  name: string;
  description?: string | null;
  icon?: string | null;
}

@Injectable()
export class CreateCategoryCommand {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(input: CreateCategoryInput): Promise<Category> {
    const clash = await this.categories.findByNameInsensitive(input.name);
    if (clash) throw new CategoryNameConflictError(input.name);

    const category = Category.create(input.name, input.description ?? null, input.icon ?? null);
    return this.categories.save(category);
  }
}
