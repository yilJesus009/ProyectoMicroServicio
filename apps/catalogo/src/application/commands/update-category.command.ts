import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { Category } from '../../domain/entities/category';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found.error';
import { CategoryNameConflictError } from '../../domain/errors/category-name-conflict.error';

export interface UpdateCategoryInput {
  name: string;
  description?: string | null;
  icon?: string | null;
}

@Injectable()
export class UpdateCategoryCommand {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(id: number, input: UpdateCategoryInput): Promise<Category> {
    const existing = await this.categories.findById(id);
    if (!existing) throw new CategoryNotFoundError(id);

    const clash = await this.categories.findByNameInsensitive(input.name, id);
    if (clash) throw new CategoryNameConflictError(input.name);

    const updated = existing.withEdits(input.name, input.description ?? null, input.icon ?? null);
    await this.categories.update(updated);
    return updated;
  }
}
