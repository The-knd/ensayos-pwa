import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { inTenant } from '../../../commons/database/in-tenant';
import { StructuredLogger } from '../../../commons/logger/structured-logger.service';
import { IntegrationConnection } from '../entities/integration-connection.entity';
import { IntegrationJob, IntegrationJobTrigger } from '../entities/integration-job.entity';
import { IntegrationError } from '../http/integration.errors';
import { IntegrationConnectionsService } from '../integration-connections.service';
import { IntegrationJobsService } from '../integration-jobs.service';
import { IntegrationEnvironment, IntegrationOperation } from '../integration.types';
import { ClientSyncSettingsDto, SyncCursor } from './client-sync.strategy';
import { ClientSyncStrategyRegistry } from './client-sync-strategy.registry';
import { ClientSyncService, emptyResult } from './client-sync.service';

const INTERVAL_NAME = 'client-sync-worker';
/** Jobs por empresa en cada vuelta. */
const BATCH_SIZE = 5;
/** Tope de páginas por job: corta un bucle si el origen pagina mal. */
const MAX_PAGES = 5_000;
const DAY_MS = 24 * 60 * 60_000;

/**
 * Sincronización de clientes en segundo plano. Copia el patrón de
 * CreditStudyPoller:
 *   - Intervalo del .env registrado en SchedulerRegistry (0 = apagado), y
 *     apagado del todo si INTEGRATIONS_ENABLED es false.
 *   - Flag `running`: una vuelta lenta no se solapa con la siguiente.
 *   - Empresas activas una a una; toda lectura/escritura en `inTenant`.
 *   - Llamadas HTTP fuera de transacciones (no retienen conexiones del pool).
 *
 * Diferencias:
 *   - Pausa por empresa tras un error de autenticación: la credencial mala de
 *     una empresa no detiene a las demás (el poller de Saman pausa todo porque
 *     usa una sola credencial global).
 *   - Solo sincroniza la conexión de producción. La de pruebas sirve para
 *     "Probar conexión", no escribe clientes.
 *   - La sesión con el sistema externo se abre y se cierra por job (finally):
 *     nunca se comparte entre empresas ni queda abierta.
 */
@Injectable()
export class ClientSyncWorker implements OnModuleInit {
  private running = false;
  private readonly pausedUntil = new Map<string, number>();

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly connections: IntegrationConnectionsService,
    private readonly jobs: IntegrationJobsService,
    private readonly strategies: ClientSyncStrategyRegistry,
    private readonly sync: ClientSyncService,
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
    const { companyId } = job;
    const attempts = job.attempts + 1;
    const maxAttempts = Number(this.config.get('CLIENT_SYNC_MAX_ATTEMPTS') ?? 5);
    const result = emptyResult();
    try {
      const { connection, credentials } = await this.connections.loadForUse(companyId, job.system, job.environment);
      if (!connection.enabled) throw new IntegrationError('definitive', 'La conexión está desactivada');
      const strategy = this.strategies.resolve(job.system, connection.settings.strategy);
      const settings = connection.settings as unknown as ClientSyncSettingsDto;

      const previous = await inTenant(this.dataSource, companyId, (m) =>
        this.jobs.lastDone(m, { companyId, system: job.system, operation: job.operation }),
      );
      // Marca de agua del próximo job: ayer (SAP guarda solo la fecha; el solape lo absorbe el hash).
      const watermark = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);
      let cursor: SyncCursor | null = { since: (previous?.cursor?.since as string | undefined) ?? null, skip: 0 };

      const session = await strategy.open(connection, credentials);
      try {
        for (let page = 0; cursor && page < MAX_PAGES; page++) {
          const { items, next } = await strategy.fetchPage(session, connection, cursor);
          await inTenant(this.dataSource, companyId, (m) =>
            this.sync.persistPage(m, companyId, job.system, items, settings.ownedFields, result),
          );
          cursor = next;
        }
      } finally {
        await strategy.close(session);
      }

      await inTenant(this.dataSource, companyId, (m) => this.jobs.finish(m, job, result, { since: watermark }));
      this.logger.log(
        `Sincronización de clientes ${job.system} (empresa ${companyId}, job ${job.id}): ` +
          `${result.processed} procesados, ${result.created} creados, ${result.updated} actualizados, ` +
          `${result.linked} enlazados, ${result.failed} con error`,
      );
    } catch (err) {
      const error = err instanceof IntegrationError ? err : new IntegrationError('transient', (err as Error).message);
      await inTenant(this.dataSource, companyId, (m) => this.jobs.failOrRetry(m, job, error, attempts, maxAttempts, result));
      if (error.type === 'auth') {
        const pause = Number(this.config.get('INTEGRATIONS_AUTH_PAUSE_MS') ?? 300_000);
        this.pausedUntil.set(companyId, Date.now() + pause);
        this.logger.error(
          `${job.system} rechazó la credencial de la empresa ${companyId}; sus sincronizaciones quedan en pausa ` +
            `${Math.round(pause / 60_000)} min. Revisa la conexión en Configuración global → Integraciones.`,
        );
      } else {
        this.logger.warn(`Sincronización de clientes (${error.type}) empresa ${companyId}, job ${job.id}: ${error.message}`);
      }
    }
  }
}
