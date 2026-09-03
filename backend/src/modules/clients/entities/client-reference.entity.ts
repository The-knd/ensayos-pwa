import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';
import { Client } from './client.entity';

@Entity('client_references')
export class ClientReference extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @ManyToOne(() => Client, (c) => c.references)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ type: 'int' })
  sequence: number;

  @Column({ name: 'entity', type: 'varchar', nullable: true })
  entity: string;

  @Column({ name: 'address', type: 'varchar', nullable: true })
  address: string;

  @Column({ name: 'department', type: 'varchar', nullable: true })
  department: string;

  @Column({ name: 'city', type: 'varchar', nullable: true })
  city: string;

  @Column({ name: 'phone', type: 'varchar', nullable: true })
  phone: string;

  @Column({ name: 'credit_limit', type: 'varchar', nullable: true })
  creditLimit: string;
}