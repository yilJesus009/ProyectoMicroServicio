import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entidad TypeORM. Vive solo en infrastructure/: el dominio (domain/entities/vehicle.ts)
 * no conoce decoradores ni el ORM (AGENTS.md §7).
 */
@Entity({ name: 'vehicles', schema: 'catalogo' })
export class VehicleOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'owner_id' })
  ownerId: number;

  @Column({ type: 'varchar' })
  brand: string;

  @Column({ type: 'varchar' })
  model: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'varchar', nullable: true })
  plate: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
