import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListActiveCategoriesQuery } from '../../application/queries/list-active-categories.query';
import { GetCategoryByIdQuery } from '../../application/queries/get-category-by-id.query';
import { JwtAuthGuard } from './jwt-auth.guard';
import { success } from './response.util';

@ApiTags('Categorías')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(
    private readonly listActive: ListActiveCategoriesQuery,
    private readonly getById: GetCategoryByIdQuery,
  ) {}

  @ApiOperation({ summary: 'Categorías activas' })
  @Get()
  async findActive() {
    const categories = await this.listActive.execute();
    return success(categories);
  }

  @ApiOperation({ summary: 'Una categoría por id, incluida inactiva' })
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const category = await this.getById.execute(id);
    return success(category);
  }
}
