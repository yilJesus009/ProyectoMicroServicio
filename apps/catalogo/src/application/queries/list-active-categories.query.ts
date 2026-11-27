import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { Category } from '../../domain/entities/category';

@Injectable()
export class ListActiveCategoriesQuery {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(): Promise<Category[]> {
    return this.categories.findActive();
  }
}
