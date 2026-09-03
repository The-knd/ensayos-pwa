import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('devices')
export class Device extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'credential_id', unique: true })
  credentialId: string;

  @Column({ name: 'public_key', type: 'text' })
  publicKey: string;

  @Column({ type: 'int', default: 0 })
  counter: number;

  @Column({ name: 'device_name', nullable: true })
  deviceName: string;
}
