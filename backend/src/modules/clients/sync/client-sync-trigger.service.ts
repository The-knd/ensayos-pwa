import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { SUPER_ADMIN_PROFILE_ID } from '../../../commons/constants';
import { ConnectionsService } from '../../config/connections/connections.service';
import { IntegrationEnvironment } from '../../config/connections/integration.types';
import { IntegrationJobTrigger } from './entities/integration-job.entity';
import { IntegrationJobsService } from './jobs/integration-jobs.service';
import { IntegrationOperation } from './integration-operation';
import { ClientSyncStrategyRegistry } from './client-sync-strategy.registry';

/** Contexto del token tras JwtAuthGuard. */
interface AuthUser {
  sub: string;
  companyId: string | null;
  profileId: string;
}

/** Resultado del disparo manual: el job (nuevo o ya activo) que la GUI sigue. */
export interface SyncTriggerResult {
  jobId: string;
  status: string;
  created: boolean;
}

/**
 * Disparo MANUAL de la sincronización de clientes de una empresa.
 *
 * - No conoce ningún sistema concreto: elige la conexión de Producción activa
 *   cuya estrategia esté registrada y encola un job para SU sistema.
 * - La empresa efectiva se resuelve de forma segura: un usuario normal solo
 *   puede sincronizar SU empresa (el `companyId` del token; se ignora cualquier
 *   valor que venga del request). El superadmin, que no tiene empresa, la
 *   indica en el contexto del módulo (body/query) y se valida que exista.
 * - Una sola ejecución por empresa/sistema: se apoya en el índice único parcial
 *   de `integration_jobs`; si ya hay un job activo se devuelve ese (idempotente,
 *   para que la GUI siga el que está en curso en vez de fallar).
 * - La ejecución en sí la hace ClientSyncRunner (el mismo que el worker).
 */
@Injectable()
export class ClientSyncTriggerService {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly jobs: IntegrationJobsService,
    private readonly strategies: ClientSyncStrategyRegistry,
  ) {}

  /** Encola la sincronización manual y devuelve el job a seguir. */
  async syncClients(user: AuthUser, moduleCompanyId?: string): Promise<SyncTriggerResult> {
    this.connections.ensureEnabled();
    const companyId = await this.resolveEffectiveCompany(user, moduleCompanyId);

    const connections = await this.connections.list(companyId);
    const active = connections.find(
      (c) => c.environment === IntegrationEnvironment.PRODUCTION && c.enabled && this.strategies.keysFor(c.system).length > 0,
    );
    if (!active) {
      throw new BadRequestException('No hay una conexión de producción activa con estrategia de sincronización para esta empresa');
    }

    const { job, created } = await this.jobs.enqueue(
      { companyId, system: active.system, environment: IntegrationEnvironment.PRODUCTION, operation: IntegrationOperation.CLIENTS_SYNC },
      IntegrationJobTrigger.MANUAL,
      user.sub,
    );
    return { jobId: job.id, status: job.status, created };
  }

  /** Historial reciente de sincronizaciones de la empresa efectiva. */
  async listJobs(user: AuthUser, moduleCompanyId?: string, limit?: number) {
    const companyId = await this.resolveEffectiveCompany(user, moduleCompanyId);
    return this.jobs.listRecent(companyId, limit);
  }

  /** Estado de un job concreto de la empresa efectiva. */
  getJob(user: AuthUser, moduleCompanyId: string | undefined, jobId: string) {
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
