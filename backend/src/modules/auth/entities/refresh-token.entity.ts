import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';

@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ unique: true })
  token: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;
}
