import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';
import { Company } from '../../config/entities/company.entity';

@Entity('module_placements')
export class ModulePlacement extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'varchar', length: 60 })
  key: string;

  @Column({ type: 'varchar', length: 60 })
  module: string;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ type: 'enum', enum: ['grid', 'fab'], default: 'grid' })
  placement: 'grid' | 'fab';

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'varchar', length: 200 })
  path: string;

  @Column({ type: 'varchar', length: 100 })
  perm: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  flag: string | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;
}
