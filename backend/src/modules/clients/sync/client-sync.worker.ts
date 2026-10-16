import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { inTenant } from '../../../commons/database/in-tenant';
import { StructuredLogger } from '../../../commons/logger/structured-logger.service';
import { ConnectionsService } from '../../config/connections/connections.service';
import { IntegrationConnection } from '../../config/connections/entities/integration-connection.entity';
import { IntegrationEnvironment } from '../../config/connections/integration.types';
import { IntegrationJob, IntegrationJobTrigger } from './entities/integration-job.entity';
import { IntegrationJobsService } from './jobs/integration-jobs.service';
import { IntegrationOperation } from './integration-operation';
import { ClientSyncSettingsDto } from './client-sync.strategy';
import { ClientSyncRunner } from './client-sync-runner.service';

const INTERVAL_NAME = 'client-sync-worker';
/** Jobs por empresa en cada vuelta. */
const BATCH_SIZE = 5;

/**
 * Sincronización de clientes en segundo plano. Copia el patrón de
 * CreditStudyPoller:
 *   - Intervalo del .env registrado en SchedulerRegistry (0 = apagado), y
 *     apagado del todo si INTEGRATIONS_ENABLED es false.
 *   - Flag `running`: una vuelta lenta no se solapa con la siguiente.
 *   - Empresas activas una a una; toda lectura/escritura en `inTenant`.
 *
 * Diferencias:
 *   - Pausa por empresa tras un error de autenticación: la credencial mala de
 *     una empresa no detiene a las demás (el poller de Saman pausa todo porque
 *     usa una sola credencial global).
 *   - Solo sincroniza la conexión de producción. La de pruebas sirve para
 *     "Probar conexión", no escribe clientes.
 *   - La ejecución del job está en ClientSyncRunner (compartido con el disparo).
 */
@Injectable()
export class ClientSyncWorker implements OnModuleInit {
  private running = false;
  private readonly pausedUntil = new Map<string, number>();

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly connections: ConnectionsService,
    private readonly jobs: IntegrationJobsService,
    private readonly runner: ClientSyncRunner,
    private readonly config: ConfigService,
    private readonly scheduler: SchedulerRegistry,
    private readonly logger: StructuredLogger,
  ) {}

  onModuleInit() {
    const interval = Number(this.config.get('CLIENT_SYNC_POLL_INTERVAL_MS') ?? 60_000);
    if (!this.connections.enabled || interval <= 0) return;
    this.scheduler.addInterval(INTERVAL_NAME, setInterval(() => void this.tick(), interval));
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const companies: { id: string }[] = await this.dataSource.query(`SELECT id FROM companies WHERE is_active`);
      for (const { id } of companies) {
        if (Date.now() < (this.pausedUntil.get(id) ?? 0)) continue;
        try {
          await this.enqueueScheduled(id);
          await this.processCompany(id);
        } catch (err) {
          this.logger.error(`Sincronización de clientes, empresa ${id}: ${(err as Error).message}`);
        }
      }
    } finally {
      this.running = false;
    }
  }

  /** Encola la sincronización programada de la empresa si ya le toca. */
  private async enqueueScheduled(companyId: string) {
    const due = await inTenant(this.dataSource, companyId, async (m) => {
      const conns = await m.find(IntegrationConnection, { where: { companyId, environment: IntegrationEnvironment.PRODUCTION, enabled: true } });
      const result: IntegrationConnection[] = [];
      for (const conn of conns) {
        const every = (conn.settings as unknown as ClientSyncSettingsDto).schedule?.everyMinutes;
        if (!every) continue;
        const last = await this.jobs.latest(m, { companyId, system: conn.system, operation: IntegrationOperation.CLIENTS_SYNC });
        if (!last || last.createdAt.getTime() + every * 60_000 <= Date.now()) result.push(conn);
      }
      return result;
    });
    for (const conn of due) {
      const key = { companyId, system: conn.system, environment: conn.environment, operation: IntegrationOperation.CLIENTS_SYNC };
      await this.jobs.enqueue(key, IntegrationJobTrigger.SCHEDULE, null);
    }
  }

  private async processCompany(companyId: string) {
    const due = await inTenant(this.dataSource, companyId, async (m) => {
      await this.jobs.requeueStale(m, companyId);
      return this.jobs.due(m, companyId, BATCH_SIZE);
    });
    for (const job of due) {
      if (Date.now() < (this.pausedUntil.get(companyId) ?? 0)) return;
      const claimed = await inTenant(this.dataSource, companyId, (m) => this.jobs.claim(m, job));
      if (claimed) await this.run(job);
    }
  }

  private async run(job: IntegrationJob) {
    const error = await this.runner.runJob(job);
    if (error?.type === 'auth') {
      const pause = Number(this.config.get('INTEGRATIONS_AUTH_PAUSE_MS') ?? 300_000);
      this.pausedUntil.set(job.companyId, Date.now() + pause);
      this.logger.error(
        `${job.system} rechazó la credencial de la empresa ${job.companyId}; sus sincronizaciones quedan en pausa ` +
          `${Math.round(pause / 60_000)} min. Revisa la conexión en Configuración global → Conexiones.`,
      );
    }
  }
}
