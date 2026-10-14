import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { IntegrationEnvironment, IntegrationOperation, IntegrationSystem } from '../integration.types';
import { IntegrationErrorType } from '../http/integration.errors';

export enum IntegrationJobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  DONE = 'done',
  FAILED = 'failed',
}

export enum IntegrationJobTrigger {
  MANUAL = 'manual',
  SCHEDULE = 'schedule',
}

/** Contadores de una sincronización; `errors` son registros sueltos que no detienen el job. */
export interface SyncResult {
  processed: number;
  created: number;
  updated: number;
  linked: number;
  unchanged: number;
  failed: number;
  errors: { externalId: string; message: string }[];
}

export interface IntegrationJobError {
  type: IntegrationErrorType;
  message: string;
  at: string;
}

/**
 * Un job de integración: cola, estado, reintentos y auditoría. Nunca guarda
 * credenciales ni el payload del sistema externo, solo contadores y errores.
 */
@Entity('integration_jobs')
export class IntegrationJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ type: 'varchar', length: 40 })
  system: IntegrationSystem;

  @Column({ type: 'varchar', length: 20 })
  environment: IntegrationEnvironment;

  @Column({ type: 'varchar', length: 60 })
  operation: IntegrationOperation;

  @Column({ type: 'varchar', length: 20 })
  trigger: IntegrationJobTrigger;

  @Column({ name: 'launched_by', type: 'uuid', nullable: true })
  launchedBy: string | null;

  @Column({ type: 'varchar', length: 20, default: IntegrationJobStatus.QUEUED })
  status: IntegrationJobStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'next_attempt_at', type: 'timestamptz' })
  nextAttemptAt: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  /** Marca de agua de la sincronización (p. ej. UpdateDate de SAP); la del último job `done` es la base del siguiente. */
  @Column({ type: 'jsonb', nullable: true })
  cursor: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  result: SyncResult | null;

  @Column({ type: 'jsonb', nullable: true })
  error: IntegrationJobError | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
