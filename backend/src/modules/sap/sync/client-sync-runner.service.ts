import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { inTenant } from '../../../commons/database/in-tenant';
import { StructuredLogger } from '../../../commons/logger/structured-logger.service';
import { IntegrationJob } from '../entities/integration-job.entity';
import { IntegrationError } from '../http/integration.errors';
import { IntegrationConnectionsService } from '../integration-connections.service';
import { IntegrationJobsService } from '../integration-jobs.service';
import { ClientSyncSettingsDto, SyncCursor } from './client-sync.strategy';
import { ClientSyncStrategyRegistry } from './client-sync-strategy.registry';
import { ClientSyncService, emptyResult } from './client-sync.service';

/** Tope de páginas por job: corta un bucle si el origen pagina mal. */
const MAX_PAGES = 5_000;
const DAY_MS = 24 * 60 * 60_000;

/**
 * Ejecuta un job de sincronización de clientes de principio a fin: abre sesión
 * con el sistema externo, página, aplica en `clients` y finaliza el job
 * (`finish` / `failOrRetry`). El job debe venir ya reservado (`claim`).
 *
 * Lo comparten el worker programado (ClientSyncWorker) y el disparo síncrono
 * (SapSyncService): así el comportamiento es idéntico por los dos caminos y no
 * hay lógica duplicada.
 *
 * No lanza: devuelve el IntegrationError si el job falló, para que cada
 * llamador decida qué hacer (el worker pausa la empresa ante un error de auth;
 * el endpoint síncrono solo reporta el estado del job).
 */
@Injectable()
export class ClientSyncRunner {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly connections: IntegrationConnectionsService,
    private readonly jobs: IntegrationJobsService,
    private readonly strategies: ClientSyncStrategyRegistry,
    private readonly sync: ClientSyncService,
    private readonly config: ConfigService,
    private readonly logger: StructuredLogger,
  ) {}

  async runJob(job: IntegrationJob): Promise<IntegrationError | null> {
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
      return null;
    } catch (err) {
      const error = err instanceof IntegrationError ? err : new IntegrationError('transient', (err as Error).message);
      await inTenant(this.dataSource, companyId, (m) => this.jobs.failOrRetry(m, job, error, attempts, maxAttempts, result));
      this.logger.warn(`Sincronización de clientes (${error.type}) empresa ${companyId}, job ${job.id}: ${error.message}`);
      return error;
    }
  }
}
