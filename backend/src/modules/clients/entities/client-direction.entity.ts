import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';
import { Client } from './client.entity';

export enum ClientDirectionType {
  PRINCIPAL = 'principal',
  DESPACHO = 'despacho',
}

@Entity('client_directions')
export class ClientDirection extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @ManyToOne(() => Client, (c) => c.directions)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ name: 'type', type: 'enum', enum: ClientDirectionType, enumName: 'client_directions_type_enum' })
  type: ClientDirectionType;

  @Column({ name: 'address', type: 'varchar', nullable: true })
  address: string;

  @Column({ name: 'department', type: 'varchar', nullable: true })
  department: string;

  @Column({ name: 'city', type: 'varchar', nullable: true })
  city: string;

  @Column({ name: 'postal_code', type: 'varchar', nullable: true })
  postalCode: string;

  @Column({ name: 'phone', type: 'varchar', nullable: true })
  phone: string;

  @Column({ name: 'contact_first_name', type: 'varchar', nullable: true })
  contactFirstName: string;

  @Column({ name: 'contact_second_name', type: 'varchar', nullable: true })
  contactSecondName: string;

  @Column({ name: 'contact_first_last_name', type: 'varchar', nullable: true })
  contactFirstLastName: string;

  @Column({ name: 'contact_second_last_name', type: 'varchar', nullable: true })
  contactSecondLastName: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;
}