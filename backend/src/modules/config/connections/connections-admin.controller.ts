import { Body, Controller, Delete, Get, Param, ParseEnumPipe, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../commons/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../commons/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../commons/guards/super-admin.guard';
import { ConnectionsService } from './connections.service';
import { ConnectionPluginsRegistry } from './connection-plugins';
import { UpsertConnectionDto } from './dto/upsert-connection.dto';
import { IntegrationAuthType, IntegrationEnvironment } from './integration.types';

const environmentPipe = new ParseEnumPipe(IntegrationEnvironment);

/**
 * Administración de conexiones, solo superadmin (Configuración global →
 * Conexiones). La empresa va en la ruta y el autor sale del token: nada de eso
 * se acepta en el body.
 *
 * El sistema (`:system`) es un string abierto: el servicio lo resuelve contra el
 * registro de plugins y responde 400 si no hay adaptador registrado. Los jobs y
 * el disparo de sincronización viven en `clients/sync` (ClientSyncController).
 */
@Controller('connections')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class ConnectionsAdminController {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly plugins: ConnectionPluginsRegistry,
  ) {}

  /** Lo que la GUI necesita para pintar el formulario. */
  @Get('meta')
  meta() {
    return {
      enabled: this.connections.enabled,
      systems: this.plugins.systems(),
      environments: Object.values(IntegrationEnvironment),
      authTypes: Object.values(IntegrationAuthType),
    };
  }

  @Get('companies/:companyId')
  list(@Param('companyId', new ParseUUIDPipe()) companyId: string) {
    return this.connections.list(companyId);
  }

  @Put('companies/:companyId/:system/:environment')
  upsert(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Param('system') system: string,
    @Param('environment', environmentPipe) environment: IntegrationEnvironment,
    @Body() dto: UpsertConnectionDto,
    @CurrentUser() user,
  ) {
    return this.connections.upsert(companyId, system, environment, dto, user.sub);
  }

  @Delete('companies/:companyId/:system/:environment')
  remove(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Param('system') system: string,
    @Param('environment', environmentPipe) environment: IntegrationEnvironment,
    @CurrentUser() user,
  ) {
    return this.connections.remove(companyId, system, environment, user.sub);
  }

  @Post('companies/:companyId/:system/:environment/test')
  test(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Param('system') system: string,
    @Param('environment', environmentPipe) environment: IntegrationEnvironment,
    @CurrentUser() user,
  ) {
    return this.connections.test(companyId, system, environment, user.sub);
  }
}
