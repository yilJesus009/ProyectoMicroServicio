export class CategoryNotFoundError extends Error {
  constructor(id: number) {
    super(`La categoria ${id} no existe`);
    this.name = 'CategoryNotFoundError';
  }
}
