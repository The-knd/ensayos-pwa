import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [RbacModule],
  controllers: [HealthController],
})
export class HealthModule {}
