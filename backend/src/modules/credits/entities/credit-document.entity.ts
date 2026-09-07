import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';
import { Company } from '../../config/entities/company.entity';
import { Credit } from './credit.entity';

@Entity('credit_documents')
export class CreditDocument extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'credit_id' })
  creditId: string;

  @ManyToOne(() => Credit, (c) => c.documents)
  @JoinColumn({ name: 'credit_id' })
  credit: Credit;

  @Column({ length: 50 })
  code: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ nullable: true })
  url: string;

  @Column({ name: 'signed_at', type: 'timestamp', nullable: true })
  signedAt: Date;
}