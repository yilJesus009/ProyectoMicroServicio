import { CreateVehicleCommand } from '../../src/application/commands/create-vehicle.command';
import { Vehicle } from '../../src/domain/entities/vehicle';
import { VehicleRepository } from '../../src/domain/repositories/vehicle.repository';

describe('CreateVehicleCommand', () => {
  it('guarda el vehiculo con el ownerId recibido por parametro (del JWT), no de un campo del input', async () => {
    const saved = Vehicle.create(7, 'Toyota', 'Corolla', 2020, null);
    const repo = { save: jest.fn().mockResolvedValue(saved) } as unknown as VehicleRepository;

    const result = await new CreateVehicleCommand(repo).execute(7, {
      brand: 'Toyota',
      model: 'Corolla',
      year: 2020,
    });

    expect(result).toBe(saved);
    const vehicleArg = (repo.save as jest.Mock).mock.calls[0][0] as Vehicle;
    expect(vehicleArg.ownerId).toBe(7);
  });
});
