import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Profile } from './entities/profile.entity';
import { Permission } from './entities/permission.entity';
import { ProfilePermission } from './entities/profile-permission.entity';
import { RbacService } from './rbac.service';
import { ProfilesController } from './profiles.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Profile, Permission, ProfilePermission]), RedisModule],
  controllers: [ProfilesController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
