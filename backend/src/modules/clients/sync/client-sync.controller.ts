import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../commons/decorators/current-user.decorator';
import { Permissions } from '../../../commons/decorators/permissions.decorator';
import { CompanyThrottlerGuard } from '../../../commons/guards/company-throttler.guard';
import { JwtAuthGuard } from '../../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../commons/guards/permissions.guard';
import { ClientSyncTriggerService } from './client-sync-trigger.service';
import { ClientSyncStrategyRegistry } from './client-sync-strategy.registry';
import { SyncClientsDto } from './dto/sync-clients.dto';

/**
 * Sincronización de clientes de un usuario de empresa.
 *
 * A diferencia de la administración de conexiones (superadmin, /connections),
 * aquí basta con estar autenticado y tener el permiso. La empresa se toma del
 * token (el superadmin la indica en el body/query como contexto del módulo).
 *
 * Guards, en orden: JwtAuthGuard (pone req.user) → PermissionsGuard. El
 * `CompanyThrottlerGuard` (3/min por empresa) se aplica SOLO al disparo
 * `POST` —protege la operación pesada—, nunca a las lecturas: la UI sigue el
 * job con `GET /clients/sync/:jobId` cada pocos segundos y merecería 429 si el
 * límite cubriera todo el controlador.
 *
 * El historial se sirve en `GET /clients/sync/jobs` (no en `/clients/sync` a
 * secas): `ClientsController` expone `GET /clients/:id` y, como se registra
 * antes, una ruta desnuda `/clients/sync` caería en ese `:id` (y el
 * ParseUUIDPipe la rechazaría). Con un segmento extra no hay solape.
 */
@Controller('clients/sync')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientSyncController {
  constructor(
    private readonly trigger: ClientSyncTriggerService,
    private readonly strategies: ClientSyncStrategyRegistry,
  ) {}

  /** Estrategias registradas (las que puede ofrecer el formulario de conexión). */
  @Get('meta')
  @Permissions('clients.read')
  meta() {
    return { strategies: this.strategies.all() };
  }

  /** "Sincronizar ahora": encola la sincronización y devuelve el job a seguir. */
  @Post()
  @UseGuards(CompanyThrottlerGuard)
  @Permissions('clients.update')
  syncClients(@CurrentUser() user, @Body() dto: SyncClientsDto) {
    return this.trigger.syncClients(user, dto.companyId);
  }

  /** Historial reciente de sincronizaciones de la empresa. */
  @Get('jobs')
  @Permissions('clients.read')
  history(@CurrentUser() user, @Query('companyId') companyId?: string, @Query('limit') limit?: string) {
    return this.trigger.listJobs(user, companyId, Number(limit) || undefined);
  }

  /** Estado de una sincronización concreta. */
  @Get(':jobId')
  @Permissions('clients.read')
  job(@CurrentUser() user, @Param('jobId', new ParseUUIDPipe()) jobId: string, @Query('companyId') companyId?: string) {
    return this.trigger.getJob(user, companyId, jobId);
  }
}
