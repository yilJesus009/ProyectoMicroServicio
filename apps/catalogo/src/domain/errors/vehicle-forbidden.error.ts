export class VehicleForbiddenError extends Error {
  constructor(id: number) {
    super(`El vehiculo ${id} no pertenece al usuario autenticado`);
    this.name = 'VehicleForbiddenError';
  }
}
