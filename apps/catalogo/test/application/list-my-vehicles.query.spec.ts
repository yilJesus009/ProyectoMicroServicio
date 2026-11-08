import { ListMyVehiclesQuery } from '../../src/application/queries/list-my-vehicles.query';
import { Vehicle } from '../../src/domain/entities/vehicle';
import { VehicleRepository } from '../../src/domain/repositories/vehicle.repository';

describe('ListMyVehiclesQuery', () => {
  it('devuelve los vehiculos del dueño indicado', async () => {
    const mine = [new Vehicle(1, 7, 'Toyota', 'Corolla', 2020, null, new Date())];
    const repo = { findByOwner: jest.fn().mockResolvedValue(mine) } as unknown as VehicleRepository;

    const result = await new ListMyVehiclesQuery(repo).execute(7);

    expect(result).toBe(mine);
    expect(repo.findByOwner).toHaveBeenCalledWith(7);
  });
});
