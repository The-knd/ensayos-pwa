import { Body, Controller, Delete, Get, Param, ParseEnumPipe, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../commons/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../commons/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../commons/guards/super-admin.guard';
import { UpsertConnectionDto } from '../dto/upsert-connection.dto';
import { IntegrationJobTrigger } from '../entities/integration-job.entity';
import { IntegrationConnectionsService } from '../integration-connections.service';
import { IntegrationJobsService } from '../integration-jobs.service';
import { IntegrationEnvironment, IntegrationOperation, IntegrationSystem } from '../integration.types';
import { ClientSyncStrategyRegistry } from '../sync/client-sync-strategy.registry';

const systemPipe = new ParseEnumPipe(IntegrationSystem);
const environmentPipe = new ParseEnumPipe(IntegrationEnvironment);

/**
 * Administración de integraciones, solo superadmin (Configuración global →
 * Integraciones). La empresa va en la ruta y el autor sale del token: nada de
 * eso se acepta en el body.
 */
@Controller('integrations')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class IntegrationsAdminController {
  constructor(
    private readonly connections: IntegrationConnectionsService,
    private readonly jobs: IntegrationJobsService,
    private readonly strategies: ClientSyncStrategyRegistry,
  ) {}

  /** Lo que la GUI necesita para pintar el formulario. */
  @Get('meta')
  meta() {
    return {
      enabled: this.connections.enabled,
      systems: Object.values(IntegrationSystem).map((system) => ({ system, strategies: this.strategies.keysFor(system) })),
      environments: Object.values(IntegrationEnvironment),
    };
  }

  @Get('companies/:companyId')
  list(@Param('companyId', new ParseUUIDPipe()) companyId: string) {
    return this.connections.list(companyId);
  }

  @Get('companies/:companyId/jobs')
  listJobs(@Param('companyId', new ParseUUIDPipe()) companyId: string, @Query('limit') limit?: string) {
    return this.jobs.listRecent(companyId, Number(limit) || 20);
  }

  @Get('companies/:companyId/jobs/:jobId')
  getJob(@Param('companyId', new ParseUUIDPipe()) companyId: string, @Param('jobId', new ParseUUIDPipe()) jobId: string) {
    return this.jobs.get(companyId, jobId);
  }

  @Put('companies/:companyId/:system/:environment')
  upsert(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Param('system', systemPipe) system: IntegrationSystem,
    @Param('environment', environmentPipe) environment: IntegrationEnvironment,
    @Body() dto: UpsertConnectionDto,
    @CurrentUser() user,
  ) {
    return this.connections.upsert(companyId, system, environment, dto, user.sub);
  }

  @Delete('companies/:companyId/:system/:environment')
  remove(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Param('system', systemPipe) system: IntegrationSystem,
    @Param('environment', environmentPipe) environment: IntegrationEnvironment,
    @CurrentUser() user,
  ) {
    return this.connections.remove(companyId, system, environment, user.sub);
  }

  @Post('companies/:companyId/:system/:environment/test')
  test(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Param('system', systemPipe) system: IntegrationSystem,
    @Param('environment', environmentPipe) environment: IntegrationEnvironment,
    @CurrentUser() user,
  ) {
    return this.connections.test(companyId, system, environment, user.sub);
  }

  /** "Sincronizar ahora": siempre con la conexión de producción. Devuelve el job activo si ya había uno. */
  @Post('companies/:companyId/:system/sync/clients')
  async syncClients(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Param('system', systemPipe) system: IntegrationSystem,
    @CurrentUser() user,
  ) {
    this.connections.ensureEnabled();
    const active = (await this.connections.list(companyId)).find((c) => c.system === system && c.environment === IntegrationEnvironment.PRODUCTION);
    if (!active?.enabled) {
      return { jobId: null, status: 'rejected', message: 'La conexión de producción no existe o está desactivada' };
    }
    const { job, created } = await this.jobs.enqueue(
      { companyId, system, environment: IntegrationEnvironment.PRODUCTION, operation: IntegrationOperation.CLIENTS_SYNC },
      IntegrationJobTrigger.MANUAL,
      user.sub,
    );
    return { jobId: job.id, status: job.status, created };
  }
}
