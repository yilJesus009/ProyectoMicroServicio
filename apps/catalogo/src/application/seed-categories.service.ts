import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CategoryRepository } from '../domain/repositories/category.repository';
import { Category } from '../domain/entities/category';

/** Las 10 categorias fijas de docs/modelo-datos.md. */
const SEED_CATEGORIES: Array<[string, string]> = [
  ['Frenos', 'brake'],
  ['Batería', 'battery_full'],
  ['Filtros', 'filter_alt'],
  ['Llantas y ruedas', 'tire_repair'],
  ['Suspensión', 'compress'],
  ['Motor', 'settings'],
  ['Sistema eléctrico', 'bolt'],
  ['Iluminación', 'lightbulb'],
  ['Carrocería', 'directions_car'],
  ['Transmisión', 'sync'],
];

/** Al iniciar, si la tabla esta vacia, precarga las 10 categorias fijas. */
@Injectable()
export class SeedCategoriesService implements OnModuleInit {
  private readonly logger = new Logger(SeedCategoriesService.name);

  constructor(private readonly categories: CategoryRepository) {}

  async onModuleInit(): Promise<void> {
    const existing = await this.categories.count();
    if (existing > 0) return;

    const seed = SEED_CATEGORIES.map(([name, icon]) => Category.createSeed(name, icon));
    await this.categories.insertMany(seed);
    this.logger.log(`Precargadas ${seed.length} categorias.`);
  }
}
