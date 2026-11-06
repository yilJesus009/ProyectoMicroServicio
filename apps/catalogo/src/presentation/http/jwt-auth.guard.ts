import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  id: number | string;
  email: string | null;
  rol: string | null;
}

/**
 * Valida la FIRMA del JWT con JWT_SECRET (AGENTS.md 4.5): no confia solo en
 * los headers que ya puso el Gateway. GET /categories es para cualquier
 * usuario autenticado (docs/contratos-api.md: 🔑), sin exigir un rol.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    let payload: Record<string, unknown>;
    try {
      payload = jwt.verify(header.slice(7), process.env.JWT_SECRET as string) as Record<string, unknown>;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const user: AuthenticatedUser = {
      id: (payload.user_id ?? payload.sub) as number | string,
      email: (payload.email as string) ?? null,
      rol: (payload.rol as string) ?? null,
    };
    if (user.id === undefined || user.id === null) {
      throw new UnauthorizedException('Token sin usuario');
    }
    (req as Request & { user: AuthenticatedUser }).user = user;
    return true;
  }
}
