export class VehicleNotFoundError extends Error {
  constructor(id: number) {
    super(`El vehiculo ${id} no existe`);
    this.name = 'VehicleNotFoundError';
  }
}
