---
name: nest-backend
description: Implementar y mantener Catálogo en NestJS con TypeORM. Esquema propio en el Postgres compartido, categorías de repuestos y vehículos del comprador, guard JWT, DTOs con class-validator. Usar cuando se trabaja en apps/catalogo.
---

# NestJS Backend — Catálogo

## Antes de empezar

1. Leer `AGENTS.md` y `docs/modelo-datos.md` (esquema `catalogo`).
2. Leer `docs/contratos-api.md` (Catálogo).

## Responsabilidad

Catálogo **no publica ni consume eventos** (`docs/arquitectura.md`): es un
servicio de lectura/escritura simple por HTTP. Dos agregados sin relación
entre sí: categorías de repuestos (compartidas, las administra el admin) y
vehículos (propios de cada comprador).

## Estructura en capas

```
src/
├── domain/          entidades (Category, Vehicle), interfaces de repositorio
├── application/     commands (CreateCategory, CreateVehicle, ...), queries
├── infrastructure/  TypeORM (persistence), config
└── presentation/    controllers, DTOs (class-validator), guard JWT
```

## Esquema propio en el Postgres compartido

```typescript
// infrastructure/config/typeorm.config.ts
export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST, port: +process.env.DB_PORT,
  username: process.env.DB_CATALOGO_USER, password: process.env.DB_CATALOGO_PASSWORD,
  database: process.env.DB_NAME, schema: 'catalogo',
  entities: [Category, Vehicle], synchronize: false,
};
```

## Entidades

```typescript
@Entity({ name: 'categories', schema: 'catalogo' })
export class Category {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) name: string;
  @Column({ nullable: true }) description: string;
  @Column({ nullable: true }) icon: string;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity({ name: 'vehicles', schema: 'catalogo' })
export class Vehicle {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'owner_id' }) ownerId: number;   // viene del JWT, no del body
  @Column() brand: string;
  @Column() model: string;
  @Column() year: number;
  @Column({ nullable: true }) plate: string;
}
```

## Precarga de categorías

Al iniciar, si `categories` está vacía, insertar las 10 fijas de
`docs/modelo-datos.md` (Frenos, Batería, Filtros, Llantas y ruedas,
Suspensión, Motor, Sistema eléctrico, Iluminación, Carrocería,
Transmisión) — con un `OnModuleInit` o un seed, no a mano en la base.

## Guard JWT

Validar HS256 con el mismo `JWT_SECRET` (no confiar solo en los headers
del Gateway):

```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); return true; }
    catch { throw new UnauthorizedException(); }
  }
}
```

Para `/admin/categories`, un guard de rol adicional exige `ADMIN`; para
`/vehicles`, el `ownerId` siempre viene de `req.user.user_id`, nunca del
body.

## DTOs con class-validator

```typescript
export class CreateVehicleDto {
  @IsString() @IsNotEmpty() brand: string;
  @IsString() @IsNotEmpty() model: string;
  @IsInt() @Min(1980) year: number;
  @IsOptional() @IsString() plate?: string;
}
```

Un `ValidationPipe` global convierte el fallo en `400` con el envelope
`{status, msg, data}`.

## Manejo de errores

Un `ExceptionFilter` global mapea excepciones de dominio a HTTP
(`CategoryNotFoundException` → 404, `CategoryInactiveException` → 422) y
siempre responde el envelope estándar. Nunca exponer el stack trace.

## Comandos

```bash
npm install
npm run start:dev
npm test
```

## Reglas duras

1. Nunca consultar la base de otro servicio.
2. `owner_id` de un vehículo nunca se acepta del body.
3. Desactivar una categoría no la borra (`active: false`); no se puede
   borrar una categoría en uso.
4. `GET /health` en el puerto 4004.

## Al terminar

`npm test` pasando; el servicio arranca y precarga las categorías si la
tabla está vacía; `GET /api/v1/categories` por el Gateway responde las 10.
Resumir archivos modificados, pruebas realizadas, limitaciones.
