import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';
import { Company } from '../../config/entities/company.entity';
import { ModuleAssignment } from './module-assignment.entity';
import { ModuleVariant } from './module-variant.entity';

export interface ModuleOperation {
  action: string;
  name: string;
}

@Entity('modules')
@Index('uq_modules_global_key', ['key'], {
  unique: true,
  where: '"company_id" IS NULL',
})
export class Module extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null = null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company | null;

  @OneToMany(() => ModuleAssignment, (a) => a.module)
  assignments: ModuleAssignment[];

  @OneToMany(() => ModuleVariant, (v) => v.module)
  variants: ModuleVariant[];

  @Column({ length: 60 })
  key: string;

  @Column({ length: 60 })
  module: string;

  @Column({ length: 120 })
  label: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  icon: string | null = null;

  @Column({ length: 200 })
  path: string;

  @Column({
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  operations: ModuleOperation[] = [];

  @Column({ type: 'varchar', length: 120, nullable: true })
  flag: string | null = null;

  @Column({ default: true })
  enabled: boolean = true;
}
