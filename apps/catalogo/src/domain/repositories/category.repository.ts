import { Category } from '../entities/category';

/**
 * Interfaz del repositorio. La implementacion (TypeORM) vive en
 * infrastructure/persistence/. El dominio no sabe que existe una base de datos.
 */
export abstract class CategoryRepository {
  abstract count(): Promise<number>;
  abstract insertMany(categories: Category[]): Promise<void>;
  abstract findActive(): Promise<Category[]>;
  abstract findById(id: number): Promise<Category | null>;
  abstract findAll(): Promise<Category[]>;
  /** Compara sin distinguir mayusculas/minusculas. excludeId se usa al editar, para no chocar contra si misma. */
  abstract findByNameInsensitive(name: string, excludeId?: number): Promise<Category | null>;
  abstract save(category: Category): Promise<Category>;
  abstract update(category: Category): Promise<void>;
}
