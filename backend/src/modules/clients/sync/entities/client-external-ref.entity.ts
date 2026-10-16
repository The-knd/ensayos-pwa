import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { IntegrationSystem } from '../../../config/connections/integration.types';

/**
 * Enlace, por empresa, entre un cliente de la app y su registro en un sistema
 * externo (p. ej. CardCode de SAP). Va aparte de `clients` para no mezclar
 * columnas de cada ERP y para reconocer el registro aunque cambie su NIT.
 *
 * Puede apuntar a un cliente del padrón compartido: la empresa lo enlaza pero
 * no lo modifica (ver ClientSyncService).
 */
@Entity('client_external_refs')
@Unique('UQ_client_external_refs_external', ['companyId', 'system', 'externalId'])
@Unique('UQ_client_external_refs_client', ['companyId', 'system', 'clientId'])
export class ClientExternalRef {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ type: 'varchar', length: 40 })
  system: IntegrationSystem;

  @Column({ name: 'external_id', type: 'varchar', length: 100 })
  externalId: string;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  /** sha256 del registro externo normalizado: si no cambió, no se escribe. */
  @Column({ name: 'source_hash', type: 'char', length: 64, nullable: true })
  sourceHash: string | null;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
