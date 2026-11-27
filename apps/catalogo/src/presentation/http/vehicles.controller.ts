import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListMyVehiclesQuery } from '../../application/queries/list-my-vehicles.query';
import { CreateVehicleCommand } from '../../application/commands/create-vehicle.command';
import { DeleteVehicleCommand } from '../../application/commands/delete-vehicle.command';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { AuthenticatedUser, JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { success } from './response.util';

/** docs/contratos-api.md: vehiculos son solo del COMPRADOR (👤). */
@ApiTags('Vehículos')
@ApiBearerAuth()
@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COMPRADOR')
export class VehiclesController {
  constructor(
    private readonly listMine: ListMyVehiclesQuery,
    private readonly create: CreateVehicleCommand,
    private readonly remove: DeleteVehicleCommand,
  ) {}

  @ApiOperation({ summary: 'Mis vehículos' })
  @Get('mine')
  async findMine(@Req() req: Request & { user: AuthenticatedUser }) {
    const vehicles = await this.listMine.execute(Number(req.user.id));
    return success(vehicles);
  }

  @ApiOperation({ summary: 'Registrar un vehículo propio' })
  @Post()
  async createOne(@Req() req: Request & { user: AuthenticatedUser }, @Body() dto: CreateVehicleDto) {
    const vehicle = await this.create.execute(Number(req.user.id), dto);
    return success(vehicle, 'Vehículo registrado', 201);
  }

  @ApiOperation({ summary: 'Eliminar un vehículo propio' })
  @Delete(':id')
  async deleteOne(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.remove.execute(id, Number(req.user.id));
    return success(null, 'Vehículo eliminado');
  }
}
