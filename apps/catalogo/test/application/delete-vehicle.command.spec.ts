import { DeleteVehicleCommand } from '../../src/application/commands/delete-vehicle.command';
import { Vehicle } from '../../src/domain/entities/vehicle';
import { VehicleNotFoundError } from '../../src/domain/errors/vehicle-not-found.error';
import { VehicleForbiddenError } from '../../src/domain/errors/vehicle-forbidden.error';
import { VehicleRepository } from '../../src/domain/repositories/vehicle.repository';

describe('DeleteVehicleCommand', () => {
  it('borra cuando el solicitante es el dueño', async () => {
    const vehicle = new Vehicle(1, 7, 'Toyota', 'Corolla', 2020, null, new Date());
    const repo = {
      findById: jest.fn().mockResolvedValue(vehicle),
      deleteById: jest.fn().mockResolvedValue(undefined),
    } as unknown as VehicleRepository;

    await new DeleteVehicleCommand(repo).execute(1, 7);

    expect(repo.deleteById).toHaveBeenCalledWith(1);
  });

  it('lanza VehicleNotFoundError si no existe (-> 404)', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null) } as unknown as VehicleRepository;

    await expect(new DeleteVehicleCommand(repo).execute(999, 7)).rejects.toThrow(VehicleNotFoundError);
  });

  it('lanza VehicleForbiddenError si el solicitante no es el dueño (-> 403)', async () => {
    const vehicle = new Vehicle(1, 7, 'Toyota', 'Corolla', 2020, null, new Date());
    const repo = {
      findById: jest.fn().mockResolvedValue(vehicle),
      deleteById: jest.fn(),
    } as unknown as VehicleRepository;

    await expect(new DeleteVehicleCommand(repo).execute(1, 999)).rejects.toThrow(VehicleForbiddenError);
    expect(repo.deleteById).not.toHaveBeenCalled();
  });
});
