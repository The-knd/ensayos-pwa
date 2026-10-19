import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Catálogo de sistemas externos con los que se puede configurar una conexión
 * (SAP, una API genérica, Copilot Chat Agent…). Es GLOBAL (sin empresa ni RLS).
 *
 * `key` es el identificador abierto que guarda `integration_connections.system`.
 * El catálogo manda para la GUI; un adaptador de código (ConnectionPlugin) es
 * opcional y solo añade validación/prueba real.
 */
@Entity('connection_systems')
export class ConnectionSystem {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  key: string;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
