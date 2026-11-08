import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../domain/entities/vehicle';
import { VehicleRepository } from '../../domain/repositories/vehicle.repository';
import { VehicleMapper } from './vehicle.mapper';
import { VehicleOrmEntity } from './vehicle.orm-entity';

@Injectable()
export class TypeOrmVehicleRepository implements VehicleRepository {
  constructor(
    @InjectRepository(VehicleOrmEntity)
    private readonly repo: Repository<VehicleOrmEntity>,
  ) {}

  async findByOwner(ownerId: number): Promise<Vehicle[]> {
    const rows = await this.repo.find({ where: { ownerId }, order: { createdAt: 'DESC' } });
    return rows.map(VehicleMapper.toDomain);
  }

  async findById(id: number): Promise<Vehicle | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? VehicleMapper.toDomain(row) : null;
  }

  async save(vehicle: Vehicle): Promise<Vehicle> {
    const saved = await this.repo.save(VehicleMapper.toOrm(vehicle));
    return VehicleMapper.toDomain(saved);
  }

  async deleteById(id: number): Promise<void> {
    await this.repo.delete({ id });
  }
}
