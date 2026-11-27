/**
 * Entidad de dominio. Sin decoradores ni imports de TypeORM (AGENTS.md §7):
 * la mapea infrastructure/persistence/category.orm-entity.ts.
 */
export class Category {
  constructor(
    public readonly id: number | null,
    public readonly name: string,
    public readonly description: string | null,
    public readonly icon: string | null,
    public readonly active: boolean,
    public readonly createdAt: Date | null,
  ) {}

  static createSeed(name: string, icon: string): Category {
    return new Category(null, name, null, icon, true, null);
  }

  static create(name: string, description: string | null, icon: string | null): Category {
    return new Category(null, name, description, icon, true, null);
  }

  withEdits(name: string, description: string | null, icon: string | null): Category {
    return new Category(this.id, name, description, icon, this.active, this.createdAt);
  }

  toggled(): Category {
    return new Category(this.id, this.name, this.description, this.icon, !this.active, this.createdAt);
  }
}
