import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from './roles.decorator';
import { AuthenticatedUser } from './jwt-auth.guard';

/**
 * Se aplica DESPUES de JwtAuthGuard (req.user ya existe). Exige que
 * req.user.rol este en la lista de @Roles(...) de la ruta o el controller.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowedRoles || allowedRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    if (!allowedRoles.includes(req.user?.rol ?? '')) {
      throw new ForbiddenException('No tiene permisos para esta operacion');
    }
    return true;
  }
}
