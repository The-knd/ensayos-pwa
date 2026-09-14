import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';
import { Module } from './module.entity';
import { Company } from '../../config/entities/company.entity';

/**
 * Variante de un módulo por empresa: registra cómo se adapta el
 * comportamiento de un módulo compartido en una empresa concreta
 * (label/icon/path opcionales, operaciones activas y config libre).
 */
@Entity('module_variants')
@Unique('uq_module_variants_module_company', ['moduleId', 'companyId'])
export class ModuleVariant extends BaseEntity {
  @Column({ name: 'module_id', type: 'uuid' })
  moduleId: string;

  @ManyToOne(() => Module, (m) => m.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: Module;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'varchar', length: 120, nullable: true })
  label: string | null = null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  icon: string | null = null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  path: string | null = null;

  /** Configuración libre por empresa para que el módulo adapte su comportamiento. */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  config: Record<string, unknown> = {};

  /** Operaciones del módulo activas en esta empresa (vacío = todas). */
  @Column({ name: 'enabled_operations', type: 'jsonb', default: () => "'[]'::jsonb" })
  enabledOperations: string[] = [];
}