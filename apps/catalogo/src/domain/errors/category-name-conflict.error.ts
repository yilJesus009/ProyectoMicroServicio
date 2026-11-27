export class CategoryNameConflictError extends Error {
  constructor(name: string) {
    super(`Ya existe una categoria con el nombre "${name}" (sin distinguir mayusculas/minusculas)`);
    this.name = 'CategoryNameConflictError';
  }
}
