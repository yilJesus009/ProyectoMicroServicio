/**
 * Entidad de dominio. Sin decoradores ni imports de TypeORM (AGENTS.md §7):
 * la mapea infrastructure/persistence/vehicle.mapper.ts.
 */
export class Vehicle {
  constructor(
    public readonly id: number | null,
    public readonly ownerId: number,
    public readonly brand: string,
    public readonly model: string,
    public readonly year: number,
    public readonly plate: string | null,
    public readonly createdAt: Date | null,
  ) {}

  static create(ownerId: number, brand: string, model: string, year: number, plate: string | null): Vehicle {
    return new Vehicle(null, ownerId, brand, model, year, plate, null);
  }

  isOwnedBy(userId: number): boolean {
    return this.ownerId === userId;
  }
}
