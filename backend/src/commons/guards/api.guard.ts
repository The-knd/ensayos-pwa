import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { API_PROFILE_ID } from '../constants';

/**
 * Restringe una ruta al superadmin. Usarlo después de JwtAuthGuard (que pone
 * `request.user`). Al ser guard corre antes que los pipes: un usuario sin
 * permiso recibe 403 sin que se valide el body, así no aprende qué campos
 * espera la ruta.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (user?.profileId !== API_PROFILE_ID) {
      throw new ForbiddenException('Esta operación solo la puede realizar el perfil api');
    }
    return true;
  }
}
