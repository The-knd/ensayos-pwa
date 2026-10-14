import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../commons/decorators/current-user.decorator';
import { Permissions } from '../../../commons/decorators/permissions.decorator';
import { CompanyThrottlerGuard } from '../../../commons/guards/company-throttler.guard';
import { JwtAuthGuard } from '../../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../commons/guards/permissions.guard';
import { SapSyncService } from './sap-sync.service';
import { SyncClientsDto } from './dto/sync-clients.dto';

/**
 * Sincronización de clientes desde SAP para un usuario de empresa.
 *
 * A diferencia de la administración de conexiones (superadmin, /integrations),
 * aquí basta con estar autenticado y tener el permiso. La empresa se toma del
 * token (el superadmin la indica en el body/query como contexto del módulo).
 *
 * Guards, en orden: JwtAuthGuard (pone req.user) → CompanyThrottlerGuard
 * (3/min por empresa; necesita req.user) → PermissionsGuard.
 */
@Controller('clients/sap')
@UseGuards(JwtAuthGuard, CompanyThrottlerGuard, PermissionsGuard)
export class SapClientsController {
  constructor(private readonly sync: SapSyncService) {}

  /** "Sincronizar ahora": dispara la sincronización y espera a que termine. */
  @Post('sync')
  @Permissions('clients.update')
  syncClients(@CurrentUser() user, @Body() dto: SyncClientsDto) {
    return this.sync.syncClients(user, dto.companyId);
  }

  /** Historial reciente de sincronizaciones de la empresa. */
  @Get('sync')
  @Permissions('clients.read')
  history(@CurrentUser() user, @Query('companyId') companyId?: string, @Query('limit') limit?: string) {
    return this.sync.listJobs(user, companyId, Number(limit) || undefined);
  }

  /** Estado de una sincronización concreta. */
  @Get('sync/:jobId')
  @Permissions('clients.read')
  job(@CurrentUser() user, @Param('jobId', new ParseUUIDPipe()) jobId: string, @Query('companyId') companyId?: string) {
    return this.sync.getJob(user, companyId, jobId);
  }
}
