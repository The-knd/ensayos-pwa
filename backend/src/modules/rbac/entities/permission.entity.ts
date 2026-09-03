import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';

@Entity('permissions')
export class Permission extends BaseEntity {
  @Column()
  resource: string;

  @Column()
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  condition: Record<string, unknown> | null;

  @Column({ unique: true })
  code: string;
}
