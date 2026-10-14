import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SUPER_ADMIN_PROFILE_ID } from '../../../commons/constants';
import { inTenant } from '../../../commons/database/in-tenant';
import { IntegrationJob, IntegrationJobTrigger } from '../entities/integration-job.entity';
import { IntegrationConnectionsService } from '../integration-connections.service';
import { IntegrationJobsService } from '../integration-jobs.service';
import { IntegrationEnvironment, IntegrationOperation, IntegrationSystem } from '../integration.types';
import { ClientSyncRunner } from '../sync/client-sync-runner.service';

/** Contexto del token tras JwtAuthGuard. */
interface AuthUser {
  sub: string;
  companyId: string | null;
  profileId: string;
}

/**
 * Disparo SÍNCRONO de la sincronización de clientes desde SAP para una empresa.
 *
 * - La empresa efectiva se resuelve de forma segura: un usuario normal solo
 *   puede sincronizar SU empresa (el `companyId` del token; se ignora cualquier
 *   valor que venga del request). El superadmin, que no tiene empresa, la
 *   indica en el contexto del módulo (body/query) y se valida que exista.
 * - Una sola ejecución por empresa: se apoya en el índice único parcial de
 *   `integration_jobs`; si ya hay un job activo se responde 409.
 * - La ejecución en sí la hace ClientSyncRunner (el mismo que el worker).
 */
@Injectable()
export class SapSyncService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly connections: IntegrationConnectionsService,
    private readonly jobs: IntegrationJobsService,
    private readonly runner: ClientSyncRunner,
  ) {}

  /** Sincroniza y devuelve el job ya finalizado. */
  async syncClients(user: AuthUser, moduleCompanyId?: string): Promise<IntegrationJob> {
    this.connections.ensureEnabled();
    const companyId = await this.resolveEffectiveCompany(user, moduleCompanyId);

    const connections = await this.connections.list(companyId);
    const active = connections.find(
      (c) => c.system === IntegrationSystem.SAP && c.environment === IntegrationEnvironment.PRODUCTION && c.enabled,
    );
    if (!active) {
      throw new BadRequestException('No hay una conexión SAP de producción activa para esta empresa');
    }

    const { job, created } = await this.jobs.enqueue(
      { companyId, system: IntegrationSystem.SAP, environment: IntegrationEnvironment.PRODUCTION, operation: IntegrationOperation.CLIENTS_SYNC },
      IntegrationJobTrigger.MANUAL,
      user.sub,
    );
    if (!created) {
      throw new ConflictException('Ya hay una sincronización en curso para esta empresa');
    }

    const claimed = await inTenant(this.dataSource, companyId, (m) => this.jobs.claim(m, job));
    if (!claimed) {
      throw new ConflictException('No se pudo reservar la sincronización: ya hay una en curso');
    }

    await this.runner.runJob(job);
    return this.jobs.get(companyId, job.id);
  }

  /** Historial reciente de sincronizaciones de la empresa efectiva. */
  async listJobs(user: AuthUser, moduleCompanyId?: string, limit?: number): Promise<IntegrationJob[]> {
    const companyId = await this.resolveEffectiveCompany(user, moduleCompanyId);
    return this.jobs.listRecent(companyId, limit);
  }

  /** Estado de un job concreto de la empresa efectiva. */
  getJob(user: AuthUser, moduleCompanyId: string | undefined, jobId: string): Promise<IntegrationJob> {
    return this.resolveEffectiveCompany(user, moduleCompanyId).then((companyId) => this.jobs.get(companyId, jobId));
  }

  /**
   * Empresa sobre la que se opera:
   *   - usuario normal → su empresa del token (nunca la del request);
   *   - superadmin     → la del contexto del módulo, validada contra `companies`.
   */
  private async resolveEffectiveCompany(user: AuthUser, moduleCompanyId?: string): Promise<string> {
    const isSuperAdmin = user?.profileId === SUPER_ADMIN_PROFILE_ID;
    let companyId: string;
    if (isSuperAdmin) {
      if (!moduleCompanyId) {
        throw new BadRequestException('Falta companyId (contexto de la empresa) para el superadmin');
      }
      companyId = moduleCompanyId;
    } else {
      if (!user?.companyId) {
        throw new ForbiddenException('Tu usuario no tiene una empresa asignada');
      }
      companyId = user.companyId;
    }
    await this.connections.ensureCompany(companyId);
    return companyId;
  }
}
