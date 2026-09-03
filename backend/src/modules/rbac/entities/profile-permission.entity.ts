import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Profile } from './profile.entity';
import { Permission } from './permission.entity';

@Entity('profile_permissions')
export class ProfilePermission {
  @PrimaryColumn({ name: 'profile_id' })
  profileId: string;

  @PrimaryColumn({ name: 'permission_id' })
  permissionId: string;

  @ManyToOne(() => Profile)
  @JoinColumn({ name: 'profile_id' })
  profile: Profile;

  @ManyToOne(() => Permission)
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;
}
