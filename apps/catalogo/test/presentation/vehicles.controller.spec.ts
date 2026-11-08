import { Request } from 'express';
import { VehiclesController } from '../../src/presentation/http/vehicles.controller';
import { ListMyVehiclesQuery } from '../../src/application/queries/list-my-vehicles.query';
import { CreateVehicleCommand } from '../../src/application/commands/create-vehicle.command';
import { DeleteVehicleCommand } from '../../src/application/commands/delete-vehicle.command';
import { Vehicle } from '../../src/domain/entities/vehicle';
import { AuthenticatedUser } from '../../src/presentation/http/jwt-auth.guard';

function reqWithUser(id: number): Request & { user: AuthenticatedUser } {
  return { user: { id, email: null, rol: 'COMPRADOR' } } as unknown as Request & { user: AuthenticatedUser };
}

function buildController(overrides: {
  listMine?: Partial<ListMyVehiclesQuery>;
  create?: Partial<CreateVehicleCommand>;
  remove?: Partial<DeleteVehicleCommand>;
}) {
  return new VehiclesController(
    (overrides.listMine ?? {}) as ListMyVehiclesQuery,
    (overrides.create ?? {}) as CreateVehicleCommand,
    (overrides.remove ?? {}) as DeleteVehicleCommand,
  );
}

describe('VehiclesController', () => {
  it('GET /vehicles/mine usa el id del JWT, no un parametro', async () => {
    const mine = [new Vehicle(1, 7, 'Toyota', 'Corolla', 2020, null, new Date())];
    const listMine = { execute: jest.fn().mockResolvedValue(mine) };
    const controller = buildController({ listMine });

    const res = await controller.findMine(reqWithUser(7));

    expect(res).toEqual({ status: 200, msg: 'Operación exitosa', data: mine });
    expect(listMine.execute).toHaveBeenCalledWith(7);
  });

  it('POST /vehicles responde 201 y usa el ownerId del JWT', async () => {
    const created = Vehicle.create(7, 'Toyota', 'Corolla', 2020, null);
    const create = { execute: jest.fn().mockResolvedValue(created) };
    const controller = buildController({ create });

    const res = await controller.createOne(reqWithUser(7), { brand: 'Toyota', model: 'Corolla', year: 2020 });

    expect(res).toEqual({ status: 201, msg: 'Vehículo registrado', data: created });
    expect(create.execute).toHaveBeenCalledWith(7, { brand: 'Toyota', model: 'Corolla', year: 2020 });
  });

  it('DELETE /vehicles/:id delega la verificacion de dueño en el comando', async () => {
    const remove = { execute: jest.fn().mockResolvedValue(undefined) };
    const controller = buildController({ remove });

    const res = await controller.deleteOne(reqWithUser(7), 1);

    expect(res).toEqual({ status: 200, msg: 'Vehículo eliminado', data: null });
    expect(remove.execute).toHaveBeenCalledWith(1, 7);
  });
});
