import { BadGatewayException, BadRequestException, Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { IntegrationError } from '../config/connections/http/integration.errors';
import { RbacService } from '../rbac/rbac.service';
import { PeliculasService } from './peliculas.service';

/**
 * Módulo de Películas: una sola pantalla (`/peliculas`) protegida por
 * `peliculas.read`. La consulta se resuelve con la conexión de la empresa
 * (Configuración global → Conexiones) y su estrategia (`settings.strategy`).
 */
@Controller('peliculas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PeliculasController {
  constructor(
    private readonly service: PeliculasService,
    private readonly rbac: RbacService,
  ) {}

  @Get('context')
  async getContext(@CurrentUser() user, @CurrentTenant() companyId: string) {
    const permissions = await this.rbac.getPermissionsByPrefix(user.sub, companyId, 'peliculas');
    return { permissions, featureFlags: {} };
  }

  @Get('movies')
  @Permissions('peliculas.read')
  async movies(@CurrentTenant() companyId: string) {
    try {
      return await this.service.list(companyId);
    } catch (err) {
      throw toHttpError(err);
    }
  }
}

/**
 * Los errores de integración son `IntegrationError` (no HTTP): se traducen aquí
 * a 502 si la causa es de red/transitoria y a 400 en el resto (configuración,
 * formato o credencial rechazada).
 */
function toHttpError(err: unknown): unknown {
  if (!(err instanceof IntegrationError)) return err;
  return err.type === 'transient' ? new BadGatewayException(err.message) : new BadRequestException(err.message);
}
