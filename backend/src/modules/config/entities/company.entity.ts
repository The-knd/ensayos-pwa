import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';

export enum AuthStrategyType {
  LOCAL = 'local',
  PASSKEY = 'passkey',
  MICROSOFT = 'microsoft',
}

@Entity('companies')
export class Company extends BaseEntity {
  @Column({ length: 150 })
  name: string;

  @Column({ name: 'logo_url', type: 'varchar', nullable: true })
  logoUrl: string;

  @Column({ name: 'primary_color', length: 7, default: '#0057B8' })
  primaryColor: string;

  @Column({
    name: 'auth_strategy',
    type: 'enum',
    enum: AuthStrategyType,
    default: AuthStrategyType.LOCAL,
  })
  authStrategy: AuthStrategyType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
