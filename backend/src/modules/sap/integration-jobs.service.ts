import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, LessThanOrEqual } from 'typeorm';
import { inTenant } from '../../commons/database/in-tenant';
import { IntegrationJob, IntegrationJobStatus, IntegrationJobTrigger, SyncResult } from './entities/integration-job.entity';
import { IntegrationError } from './http/integration.errors';
import { IntegrationEnvironment, IntegrationOperation, IntegrationSystem } from './integration.types';

/** Espera creciente entre reintentos de un error transitorio (mismo criterio que el estudio de crédito). */
const BACKOFF_BASE_MS = 30_000;
const BACKOFF_MAX_MS = 15 * 60_000;
/** Un job `running` más viejo que esto quedó huérfano (proceso caído) y vuelve a la cola. */
const STALE_RUNNING_MS = 30 * 60_000;

export interface JobKey {
  companyId: string;
  system: IntegrationSystem;
  environment: IntegrationEnvironment;
  operation: IntegrationOperation;
}

/**
 * Cola de jobs de integración sobre `integration_jobs` (sin BullMQ, como el
 * resto del sistema). Un solo job activo por (empresa, sistema, operación),
 * garantizado por el índice único parcial; la reserva es optimista, así dos
 * instancias del backend nunca ejecutan el mismo job.
 */
@Injectable()
export class IntegrationJobsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Encola; si ya hay uno activo devuelve ese (doble clic, programador y botón a la vez). */
  async enqueue(key: JobKey, trigger: IntegrationJobTrigger, launchedBy: string | null): Promise<{ job: IntegrationJob; created: boolean }> {
    return inTenant(this.dataSource, key.companyId, async (m) => {
      const inserted: { id: string }[] = await m.query(
        `INSERT INTO integration_jobs (company_id, system, environment, operation, trigger, launched_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (company_id, system, operation) WHERE status IN ('queued', 'running') DO NOTHING
         RETURNING id`,
        [key.companyId, key.system, key.environment, key.operation, trigger, launchedBy],
      );
      const job = await m.findOne(IntegrationJob, {
        where: inserted[0]
          ? { id: inserted[0].id, companyId: key.companyId }
          : { companyId: key.companyId, system: key.system, operation: key.operation, status: In([IntegrationJobStatus.QUEUED, IntegrationJobStatus.RUNNING]) },
      });
      if (!job) throw new NotFoundException('No se pudo encolar la sincronización');
      return { job, created: !!inserted[0] };
    });
  }

  listRecent(companyId: string, limit = 20) {
    return inTenant(this.dataSource, companyId, (m) =>
      m.find(IntegrationJob, { where: { companyId }, order: { createdAt: 'DESC' }, take: Math.min(Math.max(limit, 1), 100) }),
    );
  }

  async get(companyId: string, id: string) {
    const job = await inTenant(this.dataSource, companyId, (m) => m.findOne(IntegrationJob, { where: { id, companyId } }));
    if (!job) throw new NotFoundException('Job no encontrado');
    return job;
  }

  /** Último job de esa operación, cualquiera sea su estado (para el programador). */
  latest(m: EntityManager, key: Omit<JobKey, 'environment'>) {
    return m.findOne(IntegrationJob, {
      where: { companyId: key.companyId, system: key.system, operation: key.operation },
      order: { createdAt: 'DESC' },
    });
  }

  /** Último job terminado bien: su cursor es la marca de agua del siguiente. */
  lastDone(m: EntityManager, key: Omit<JobKey, 'environment'>) {
    return m.findOne(IntegrationJob, {
      where: { companyId: key.companyId, system: key.system, operation: key.operation, status: IntegrationJobStatus.DONE },
      order: { finishedAt: 'DESC' },
    });
  }

  due(m: EntityManager, companyId: string, limit: number) {
    return m.find(IntegrationJob, {
      where: { companyId, status: IntegrationJobStatus.QUEUED, nextAttemptAt: LessThanOrEqual(new Date()) },
      order: { nextAttemptAt: 'ASC' },
      take: limit,
    });
  }

  /** Devuelve a la cola los jobs que un proceso caído dejó en `running`. */
  async requeueStale(m: EntityManager, companyId: string) {
    await m.query(
      `UPDATE integration_jobs SET status = 'queued', updated_at = now()
       WHERE company_id = $1 AND status = 'running' AND started_at < now() - ($2 || ' milliseconds')::interval`,
      [companyId, String(STALE_RUNNING_MS)],
    );
  }

  /** Reserva optimista: solo uno gana aunque haya varias instancias. */
  async claim(m: EntityManager, job: IntegrationJob): Promise<boolean> {
    const rows: { id: string }[] = await m.query(
      `UPDATE integration_jobs SET status = 'running', started_at = now(), attempts = attempts + 1, updated_at = now()
       WHERE id = $1 AND company_id = $2 AND status = 'queued' RETURNING id`,
      [job.id, job.companyId],
    );
    return rows.length > 0;
  }

  finish(m: EntityManager, job: IntegrationJob, result: SyncResult, cursor: Record<string, unknown>) {
    return m.update(
      IntegrationJob,
      { id: job.id, companyId: job.companyId },
      { status: IntegrationJobStatus.DONE, finishedAt: new Date(), result, cursor: cursor as IntegrationJob['cursor'] & object, error: null },
    );
  }

  /**
   * Error del job: un `transient` vuelve a la cola con espera creciente hasta
   * `maxAttempts`; `auth` y `definitive` lo terminan (reintentar con la misma
   * credencial fallaría igual).
   */
  failOrRetry(m: EntityManager, job: IntegrationJob, error: IntegrationError, attempts: number, maxAttempts: number, result?: SyncResult) {
    const at = new Date();
    const payload = { type: error.type, message: error.message.slice(0, 500), at: at.toISOString() };
    if (error.type === 'transient' && attempts < maxAttempts) {
      const wait = Math.min(BACKOFF_BASE_MS * 2 ** (attempts - 1), BACKOFF_MAX_MS);
      return m.update(
        IntegrationJob,
        { id: job.id, companyId: job.companyId },
        { status: IntegrationJobStatus.QUEUED, nextAttemptAt: new Date(at.getTime() + wait), error: payload, result: result ?? null },
      );
    }
    return m.update(
      IntegrationJob,
      { id: job.id, companyId: job.companyId },
      { status: IntegrationJobStatus.FAILED, finishedAt: at, error: payload, result: result ?? null },
    );
  }
}
