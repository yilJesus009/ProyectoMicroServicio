import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmConfig } from './infrastructure/config/typeorm.config';
import { CategoryOrmEntity } from './infrastructure/persistence/category.orm-entity';
import { TypeOrmCategoryRepository } from './infrastructure/persistence/typeorm-category.repository';
import { CategoryRepository } from './domain/repositories/category.repository';
import { ListActiveCategoriesQuery } from './application/queries/list-active-categories.query';
import { GetCategoryByIdQuery } from './application/queries/get-category-by-id.query';
import { SeedCategoriesService } from './application/seed-categories.service';
import { CategoriesController } from './presentation/http/categories.controller';
import { HealthController } from './presentation/http/health.controller';

@Module({
  imports: [TypeOrmModule.forRoot(buildTypeOrmConfig()), TypeOrmModule.forFeature([CategoryOrmEntity])],
  controllers: [CategoriesController, HealthController],
  providers: [
    { provide: CategoryRepository, useClass: TypeOrmCategoryRepository },
    ListActiveCategoriesQuery,
    GetCategoryByIdQuery,
    SeedCategoriesService,
  ],
})
export class AppModule {}
