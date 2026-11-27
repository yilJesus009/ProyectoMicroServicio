import { Injectable } from '@nestjs/common';
import { VehicleRepository } from '../../domain/repositories/vehicle.repository';
import { VehicleNotFoundError } from '../../domain/errors/vehicle-not-found.error';
import { VehicleForbiddenError } from '../../domain/errors/vehicle-forbidden.error';

@Injectable()
export class DeleteVehicleCommand {
  constructor(private readonly vehicles: VehicleRepository) {}

  async execute(id: number, requesterId: number): Promise<void> {
    const vehicle = await this.vehicles.findById(id);
    if (!vehicle) throw new VehicleNotFoundError(id);
    if (!vehicle.isOwnedBy(requesterId)) throw new VehicleForbiddenError(id);

    await this.vehicles.deleteById(id);
  }
}
