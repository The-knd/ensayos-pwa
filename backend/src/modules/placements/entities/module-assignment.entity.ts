import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { Module } from './module.entity';
import { Company } from '../../config/entities/company.entity';

@Entity('module_assignments')
export class ModuleAssignment {
  @PrimaryColumn({ name: 'module_id' })
  moduleId: string;

  @PrimaryColumn({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Module, (m) => m.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: Module;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'varchar', length: 10, default: 'grid' })
  placement: 'grid' | 'fab' = 'grid';

  @Column({ type: 'int', default: 0 })
  position: number = 0;

  @Column({ default: true })
  enabled: boolean = true;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
