import { Inject, Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PERMISSION_PROVIDER, PermissionProviderPort } from '../interfaces/permission-provider.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(PERMISSION_PROVIDER) private permissionProvider: PermissionProviderPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string[]>(PERMISSIONS_KEY, context.getHandler());
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('No autenticado');

    const userPermissions = await this.permissionProvider.getPermissions(user.sub, user.companyId);

    const hasAll = required.every((perm) => userPermissions.includes(perm));
    if (!hasAll) {
      throw new ForbiddenException('Permisos insuficientes');
    }
    return true;
  }
}
