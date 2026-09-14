import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';
import { Company } from '../../config/entities/company.entity';
import { Profile } from '../../rbac/entities/profile.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
}

@Entity('users')
export class User extends BaseEntity {
  /** Empresa principal del usuario. NULL = rol de sistema (super_admin). */
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null = null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company | null;

  @Column({ name: 'profile_id' })
  profileId: string;

  @ManyToOne(() => Profile)
  @JoinColumn({ name: 'profile_id' })
  profile: Profile;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', nullable: true })
  passwordHash: string | null;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ name: 'permissions_version', default: 0 })
  permissionsVersion: number;

  @Column({ name: 'full_name', length: 200 })
  fullName: string;
}
