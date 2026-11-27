import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CategoryOrmEntity } from '../persistence/category.orm-entity';
import { VehicleOrmEntity } from '../persistence/vehicle.orm-entity';

/**
 * Un solo PostgreSQL compartido ("repuestosya"); este servicio solo toca
 * su esquema propio ("catalogo") con su propio usuario (AGENTS.md §5).
 */
export function buildTypeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_CATALOGO_USER,
    password: process.env.DB_CATALOGO_PASSWORD,
    database: process.env.DB_NAME,
    schema: 'catalogo',
    entities: [CategoryOrmEntity, VehicleOrmEntity],
    // docs/arquitectura.md permite sincronizacion o migrations para NestJS;
    // sin un runner de migraciones todavia, se sincroniza el esquema al boot.
    synchronize: true,
    logging: false,
  };
}
