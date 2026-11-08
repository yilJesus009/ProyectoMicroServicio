import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmConfig } from './infrastructure/config/typeorm.config';
import { CategoryOrmEntity } from './infrastructure/persistence/category.orm-entity';
import { VehicleOrmEntity } from './infrastructure/persistence/vehicle.orm-entity';
import { TypeOrmCategoryRepository } from './infrastructure/persistence/typeorm-category.repository';
import { TypeOrmVehicleRepository } from './infrastructure/persistence/typeorm-vehicle.repository';
import { CategoryRepository } from './domain/repositories/category.repository';
import { VehicleRepository } from './domain/repositories/vehicle.repository';
import { ListActiveCategoriesQuery } from './application/queries/list-active-categories.query';
import { GetCategoryByIdQuery } from './application/queries/get-category-by-id.query';
import { ListAllCategoriesQuery } from './application/queries/list-all-categories.query';
import { ListMyVehiclesQuery } from './application/queries/list-my-vehicles.query';
import { CreateCategoryCommand } from './application/commands/create-category.command';
import { UpdateCategoryCommand } from './application/commands/update-category.command';
import { ToggleCategoryCommand } from './application/commands/toggle-category.command';
import { CreateVehicleCommand } from './application/commands/create-vehicle.command';
import { DeleteVehicleCommand } from './application/commands/delete-vehicle.command';
import { SeedCategoriesService } from './application/seed-categories.service';
import { CategoriesController } from './presentation/http/categories.controller';
import { AdminCategoriesController } from './presentation/http/admin-categories.controller';
import { VehiclesController } from './presentation/http/vehicles.controller';
import { HealthController } from './presentation/http/health.controller';
import { RolesGuard } from './presentation/http/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forRoot(buildTypeOrmConfig()),
    TypeOrmModule.forFeature([CategoryOrmEntity, VehicleOrmEntity]),
  ],
  controllers: [CategoriesController, AdminCategoriesController, VehiclesController, HealthController],
  providers: [
    { provide: CategoryRepository, useClass: TypeOrmCategoryRepository },
    { provide: VehicleRepository, useClass: TypeOrmVehicleRepository },
    ListActiveCategoriesQuery,
    GetCategoryByIdQuery,
    ListAllCategoriesQuery,
    ListMyVehiclesQuery,
    CreateCategoryCommand,
    UpdateCategoryCommand,
    ToggleCategoryCommand,
    CreateVehicleCommand,
    DeleteVehicleCommand,
    SeedCategoriesService,
    RolesGuard,
  ],
})
export class AppModule {}
