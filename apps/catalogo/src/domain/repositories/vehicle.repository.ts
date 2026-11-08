import { Vehicle } from '../entities/vehicle';

/**
 * Interfaz del repositorio. La implementacion (TypeORM) vive en
 * infrastructure/persistence/. El dominio no sabe que existe una base de datos.
 */
export abstract class VehicleRepository {
  abstract findByOwner(ownerId: number): Promise<Vehicle[]>;
  abstract findById(id: number): Promise<Vehicle | null>;
  abstract save(vehicle: Vehicle): Promise<Vehicle>;
  abstract deleteById(id: number): Promise<void>;
}
