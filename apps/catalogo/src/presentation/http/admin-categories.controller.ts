import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListAllCategoriesQuery } from '../../application/queries/list-all-categories.query';
import { CreateCategoryCommand } from '../../application/commands/create-category.command';
import { UpdateCategoryCommand } from '../../application/commands/update-category.command';
import { ToggleCategoryCommand } from '../../application/commands/toggle-category.command';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { success } from './response.util';

@ApiTags('Categorías (admin)')
@ApiBearerAuth()
@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCategoriesController {
  constructor(
    private readonly listAll: ListAllCategoriesQuery,
    private readonly create: CreateCategoryCommand,
    private readonly update: UpdateCategoryCommand,
    private readonly toggle: ToggleCategoryCommand,
  ) {}

  @ApiOperation({ summary: 'Todas las categorías, incluidas las inactivas' })
  @Get()
  async findAll() {
    const categories = await this.listAll.execute();
    return success(categories);
  }

  @ApiOperation({ summary: 'Crear una categoría' })
  @Post()
  async createOne(@Body() dto: CreateCategoryDto) {
    const category = await this.create.execute(dto);
    return success(category, 'Categoría creada', 201);
  }

  @ApiOperation({ summary: 'Editar una categoría' })
  @Put(':id')
  async updateOne(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    const category = await this.update.execute(id, dto);
    return success(category, 'Categoría actualizada');
  }

  @ApiOperation({ summary: 'Activar o desactivar una categoría' })
  @Patch(':id/toggle')
  async toggleOne(@Param('id', ParseIntPipe) id: number) {
    const category = await this.toggle.execute(id);
    return success(category, 'Estado actualizado');
  }
}
