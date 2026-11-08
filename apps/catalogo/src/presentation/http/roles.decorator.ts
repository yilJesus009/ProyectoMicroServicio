import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Marca una ruta con los roles permitidos. Lo lee RolesGuard. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
