import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';
import { Company } from '../../config/entities/company.entity';
import { Client } from '../../clients/entities/client.entity';

export enum CreditStatus {
  PENDING = 'pending',
  IN_STUDY = 'in_study',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('credits')
export class Credit extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'client_id' })
  clientId: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ name: 'requested_amount', type: 'decimal', precision: 12, scale: 2 })
  requestedAmount: number;

  @Column({ type: 'enum', enum: CreditStatus, default: CreditStatus.PENDING })
  status: CreditStatus;
}
