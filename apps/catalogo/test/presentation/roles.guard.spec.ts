import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../src/presentation/http/roles.guard';

function contextWithUserRole(rol: string | null): ExecutionContext {
  const req = { user: rol ? { id: 1, email: null, rol } : undefined };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function guardWithRoles(roles: string[] | undefined): RolesGuard {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(roles) } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('deja pasar si la ruta no declara @Roles(...)', () => {
    const guard = guardWithRoles(undefined);
    expect(guard.canActivate(contextWithUserRole('COMPRADOR'))).toBe(true);
  });

  it('deja pasar si el rol del usuario esta permitido', () => {
    const guard = guardWithRoles(['ADMIN']);
    expect(guard.canActivate(contextWithUserRole('ADMIN'))).toBe(true);
  });

  it('rechaza con ForbiddenException (-> 403) si el rol no esta permitido', () => {
    const guard = guardWithRoles(['ADMIN']);
    expect(() => guard.canActivate(contextWithUserRole('COMPRADOR'))).toThrow(ForbiddenException);
  });

  it('rechaza a un PROVEEDOR en una ruta de solo COMPRADOR (vehiculos)', () => {
    const guard = guardWithRoles(['COMPRADOR']);
    expect(() => guard.canActivate(contextWithUserRole('PROVEEDOR'))).toThrow(ForbiddenException);
  });

  it('rechaza a un ADMIN en una ruta de solo COMPRADOR (vehiculos)', () => {
    const guard = guardWithRoles(['COMPRADOR']);
    expect(() => guard.canActivate(contextWithUserRole('ADMIN'))).toThrow(ForbiddenException);
  });
});
