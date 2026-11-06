import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../domain/entities/category';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { CategoryMapper } from './category.mapper';
import { CategoryOrmEntity } from './category.orm-entity';

@Injectable()
export class TypeOrmCategoryRepository implements CategoryRepository {
  constructor(
    @InjectRepository(CategoryOrmEntity)
    private readonly repo: Repository<CategoryOrmEntity>,
  ) {}

  async count(): Promise<number> {
    return this.repo.count();
  }

  async insertMany(categories: Category[]): Promise<void> {
    const rows = categories.map((c) => CategoryMapper.toOrm(c));
    await this.repo.insert(rows);
  }

  async findActive(): Promise<Category[]> {
    const rows = await this.repo.find({ where: { active: true }, order: { name: 'ASC' } });
    return rows.map(CategoryMapper.toDomain);
  }

  async findById(id: number): Promise<Category | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? CategoryMapper.toDomain(row) : null;
  }
}
