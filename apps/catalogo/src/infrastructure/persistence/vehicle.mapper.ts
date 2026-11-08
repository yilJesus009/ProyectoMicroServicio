import { Vehicle } from '../../domain/entities/vehicle';
import { VehicleOrmEntity } from './vehicle.orm-entity';

/** Traduce entre la entidad de dominio (pura) y la entidad de TypeORM. */
export class VehicleMapper {
  static toDomain(orm: VehicleOrmEntity): Vehicle {
    return new Vehicle(orm.id, orm.ownerId, orm.brand, orm.model, orm.year, orm.plate, orm.createdAt);
  }

  static toOrm(vehicle: Vehicle): VehicleOrmEntity {
    const orm = new VehicleOrmEntity();
    if (vehicle.id !== null) orm.id = vehicle.id;
    orm.ownerId = vehicle.ownerId;
    orm.brand = vehicle.brand;
    orm.model = vehicle.model;
    orm.year = vehicle.year;
    orm.plate = vehicle.plate;
    return orm;
  }
}
