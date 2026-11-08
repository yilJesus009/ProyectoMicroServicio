import { Vehicle } from '../../src/domain/entities/vehicle';

describe('Vehicle (dominio)', () => {
  it('create nace sin id, con el ownerId dado', () => {
    const vehicle = Vehicle.create(7, 'Toyota', 'Corolla', 2020, 'ABC-123');

    expect(vehicle.id).toBeNull();
    expect(vehicle.ownerId).toBe(7);
    expect(vehicle.brand).toBe('Toyota');
    expect(vehicle.plate).toBe('ABC-123');
  });

  it('isOwnedBy compara el ownerId', () => {
    const vehicle = Vehicle.create(7, 'Toyota', 'Corolla', 2020, null);

    expect(vehicle.isOwnedBy(7)).toBe(true);
    expect(vehicle.isOwnedBy(8)).toBe(false);
  });
});
