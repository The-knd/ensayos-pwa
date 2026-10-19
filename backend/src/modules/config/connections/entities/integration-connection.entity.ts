import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { IntegrationAuthType, IntegrationEnvironment, IntegrationSystem } from '../integration.types';

/**
 * Conexión de una empresa con un sistema externo. No extiende BaseEntity a
 * propósito: se borra físicamente, para que una credencial eliminada no quede
 * viva (cifrada) en la base.
 *
 * `credentialsEncrypted` lleva `select: false`: ningún `find()` lo trae. Solo
 * ConnectionsService.loadForUse lo pide, y solo para conectar.
 */
@Entity('integration_connections')
@Unique('UQ_integration_connections_company_label', ['companyId', 'label'])
export class IntegrationConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  /** Sistema externo (clave del catálogo `connection_systems`). Identificador abierto. */
  @Column({ type: 'varchar', length: 40 })
  system: IntegrationSystem;

  /** Módulo de la app que consume esta conexión (`modules.module`, p. ej. `clients`). */
  @Column({ type: 'varchar', length: 60 })
  module: string;

  /** Nombre visible para identificar la conexión entre varias de la misma empresa. */
  @Column({ type: 'varchar', length: 120 })
  label: string;

  /** Plantilla del sistema con la que se definió (opcional; solo trazabilidad). */
  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  @Column({ type: 'varchar', length: 20, default: IntegrationEnvironment.PRODUCTION })
  environment: IntegrationEnvironment;

  @Column({ default: false })
  enabled: boolean;

  @Column({ name: 'auth_type', type: 'enum', enum: IntegrationAuthType, enumName: 'integration_connections_auth_type_enum' })
  authType: IntegrationAuthType;

  @Column({ name: 'base_url', type: 'text' })
  baseUrl: string;

  /** Ajustes NO secretos de la estrategia (companyDb, pageSize, schedule…). */
  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  settings: Record<string, unknown>;

  @Column({ name: 'credentials_encrypted', type: 'text', nullable: true, select: false })
  credentialsEncrypted: string | null;

  @Column({ name: 'key_version', type: 'smallint', default: 1 })
  keyVersion: number;

  @Column({ name: 'credentials_updated_at', type: 'timestamptz', nullable: true })
  credentialsUpdatedAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'last_test_at', type: 'timestamptz', nullable: true })
  lastTestAt: Date | null;

  @Column({ name: 'last_test_status', type: 'varchar', length: 20, nullable: true })
  lastTestStatus: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
