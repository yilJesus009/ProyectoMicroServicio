import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtAuthGuard } from '../../src/presentation/http/jwt-auth.guard';

function contextWithAuthHeader(header?: string): ExecutionContext {
  const req: Record<string, unknown> = { headers: header ? { authorization: header } : {} };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const OLD_ENV = process.env.JWT_SECRET;
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });
  afterAll(() => {
    process.env.JWT_SECRET = OLD_ENV;
  });

  it('rechaza sin header Authorization', () => {
    const guard = new JwtAuthGuard();
    expect(() => guard.canActivate(contextWithAuthHeader())).toThrow(UnauthorizedException);
  });

  it('rechaza un token invalido', () => {
    const guard = new JwtAuthGuard();
    expect(() => guard.canActivate(contextWithAuthHeader('Bearer token-basura'))).toThrow(UnauthorizedException);
  });

  it('acepta un token valido y deja req.user con los claims', () => {
    const token = jwt.sign({ user_id: 12, email: 'juan@taller.com', rol: 'COMPRADOR' }, 'test-secret');
    const ctx = contextWithAuthHeader(`Bearer ${token}`);

    const guard = new JwtAuthGuard();
    expect(guard.canActivate(ctx)).toBe(true);

    const req = ctx.switchToHttp().getRequest() as { user: { id: number; rol: string } };
    expect(req.user).toMatchObject({ id: 12, rol: 'COMPRADOR' });
  });
});
