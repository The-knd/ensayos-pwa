import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';
import { Company } from '../../config/entities/company.entity';

@Entity('profiles')
export class Profile extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company | null;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'is_system_role', default: false })
  isSystemRole: boolean;
}
