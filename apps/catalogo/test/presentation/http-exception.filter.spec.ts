import { ArgumentsHost, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { HttpExceptionFilter } from '../../src/presentation/http/http-exception.filter';
import { CategoryNotFoundError } from '../../src/domain/errors/category-not-found.error';
import { CategoryNameConflictError } from '../../src/domain/errors/category-name-conflict.error';
import { VehicleNotFoundError } from '../../src/domain/errors/vehicle-not-found.error';
import { VehicleForbiddenError } from '../../src/domain/errors/vehicle-forbidden.error';

function hostWithResponse() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host = { switchToHttp: () => ({ getResponse: () => res }) } as unknown as ArgumentsHost;
  return { res, host };
}

describe('HttpExceptionFilter', () => {
  it('CategoryNotFoundError -> 404 con el sobre y data null', () => {
    const { res, host } = hostWithResponse();
    new HttpExceptionFilter().catch(new CategoryNotFoundError(999), host);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ status: 404, msg: 'La categoria 999 no existe', data: null });
  });

  it('VehicleNotFoundError -> 404 con el sobre y data null', () => {
    const { res, host } = hostWithResponse();
    new HttpExceptionFilter().catch(new VehicleNotFoundError(999), host);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ status: 404, msg: 'El vehiculo 999 no existe', data: null });
  });

  it('CategoryNameConflictError -> 409 con el sobre', () => {
    const { res, host } = hostWithResponse();
    new HttpExceptionFilter().catch(new CategoryNameConflictError('Frenos'), host);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 409, data: null }),
    );
  });

  it('VehicleForbiddenError -> 403 con el sobre', () => {
    const { res, host } = hostWithResponse();
    new HttpExceptionFilter().catch(new VehicleForbiddenError(1), host);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 403, data: null }),
    );
  });

  it('ForbiddenException (rol equivocado) -> 403 con el sobre', () => {
    const { res, host } = hostWithResponse();
    new HttpExceptionFilter().catch(new ForbiddenException('No tiene permisos para esta operacion'), host);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      status: 403,
      msg: 'No tiene permisos para esta operacion',
      data: null,
    });
  });

  it('UnauthorizedException -> 401 con el sobre', () => {
    const { res, host } = hostWithResponse();
    new HttpExceptionFilter().catch(new UnauthorizedException('Token inválido o expirado'), host);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ status: 401, msg: 'Token inválido o expirado', data: null });
  });

  it('error inesperado -> 500 sin exponer el detalle interno', () => {
    const { res, host } = hostWithResponse();
    new HttpExceptionFilter().catch(new Error('boom interno'), host);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ status: 500, msg: 'Error interno del servidor', data: null });
  });
});
