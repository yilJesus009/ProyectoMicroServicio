import { Injectable } from '@nestjs/common';
import { VehicleRepository } from '../../domain/repositories/vehicle.repository';
import { Vehicle } from '../../domain/entities/vehicle';

export interface CreateVehicleInput {
  brand: string;
  model: string;
  year: number;
  plate?: string | null;
}

@Injectable()
export class CreateVehicleCommand {
  constructor(private readonly vehicles: VehicleRepository) {}

  /** ownerId siempre viene del JWT (req.user.id), nunca del body. */
  async execute(ownerId: number, input: CreateVehicleInput): Promise<Vehicle> {
    const vehicle = Vehicle.create(ownerId, input.brand, input.model, input.year, input.plate ?? null);
    return this.vehicles.save(vehicle);
  }
}
