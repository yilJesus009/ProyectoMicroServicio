import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { Category } from '../../domain/entities/category';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found.error';

/** Activa o desactiva. Nunca borra (regla dura de la skill nest-backend). */
@Injectable()
export class ToggleCategoryCommand {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(id: number): Promise<Category> {
    const existing = await this.categories.findById(id);
    if (!existing) throw new CategoryNotFoundError(id);

    const toggled = existing.toggled();
    await this.categories.update(toggled);
    return toggled;
  }
}
