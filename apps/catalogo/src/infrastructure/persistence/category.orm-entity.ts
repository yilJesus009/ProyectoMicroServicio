import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entidad TypeORM. Vive solo en infrastructure/: el dominio (domain/entities/category.ts)
 * no conoce decoradores ni el ORM (AGENTS.md §7).
 */
@Entity({ name: 'categories', schema: 'catalogo' })
export class CategoryOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  icon: string | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
