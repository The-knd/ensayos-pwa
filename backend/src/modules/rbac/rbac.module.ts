import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Profile } from './entities/profile.entity';
import { Permission } from './entities/permission.entity';
import { ProfilePermission } from './entities/profile-permission.entity';
import { RbacService } from './rbac.service';
import { ProfilesController } from './profiles.controller';
import { RedisModule } from '../redis/redis.module';
import { PERMISSION_PROVIDER } from '../../commons/interfaces/permission-provider.interface';

// Transversal (igual que RedisModule): PermissionsGuard y RbacService se
// necesitan en prácticamente todos los módulos de negocio; @Global() evita
// repetir el import en cada uno de ellos.
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Profile, Permission, ProfilePermission]), RedisModule],
  controllers: [ProfilesController],
  providers: [
    RbacService,
    { provide: PERMISSION_PROVIDER, useExisting: RbacService },
  ],
  exports: [RbacService, PERMISSION_PROVIDER],
})
export class RbacModule {}
