import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { IntegrationAuthType } from '../integration.types';

export type ConnectionFieldType = 'text' | 'number' | 'boolean' | 'json' | 'select' | 'multiselect';

/** Un campo NO secreto de `settings` que la plantilla declara para el formulario. */
export interface ConnectionFieldDescriptor {
  key: string;
  label?: string;
  type?: ConnectionFieldType;
  required?: boolean;
  options?: string[];
  default?: unknown;
  /**
   * true = cambiar este campo no obliga a volver a probar la conexión
   * (p. ej. pageSize, schedule, ownedFields). Coincide con la idea de "ajustes
   * operativos" del servicio de conexiones.
   */
  operational?: boolean;
}

/** Un secreto de la conexión (valor cifrado). La plantilla solo declara qué existe. */
export interface ConnectionSecretDescriptor {
  key: string;
  label?: string;
  required?: boolean;
}

/**
 * Plantilla de conexión de un sistema: qué campos de `settings` y qué secretos
 * tiene. Es GLOBAL (sin empresa ni RLS) y la administra el superadmin. Es la
 * fuente de verdad para pintar el formulario genérico de alta de conexión; no
 * conoce sistemas concretos salvo por `systemKey`.
 */
@Entity('connection_templates')
@Unique('UQ_connection_templates_system_label', ['systemKey', 'label'])
export class ConnectionTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'system_key', type: 'varchar', length: 40 })
  systemKey: string;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ name: 'settings_fields', type: 'jsonb', default: () => `'[]'::jsonb` })
  settingsFields: ConnectionFieldDescriptor[];

  @Column({ name: 'secret_fields', type: 'jsonb', default: () => `'[]'::jsonb` })
  secretFields: ConnectionSecretDescriptor[];

  /** Forma de autenticación por defecto de las conexiones creadas con esta plantilla. */
  @Column({ name: 'auth_type', type: 'varchar', length: 20, nullable: true })
  authType: IntegrationAuthType | null;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
