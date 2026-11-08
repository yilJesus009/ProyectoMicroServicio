import { Injectable } from '@nestjs/common';
import { VehicleRepository } from '../../domain/repositories/vehicle.repository';
import { Vehicle } from '../../domain/entities/vehicle';

@Injectable()
export class ListMyVehiclesQuery {
  constructor(private readonly vehicles: VehicleRepository) {}

  async execute(ownerId: number): Promise<Vehicle[]> {
    return this.vehicles.findByOwner(ownerId);
  }
}
