import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModulePlacement } from './entities/module-placement.entity';
import { ModulePlacementsService } from './module-placements.service';
import { ModulePlacementsController } from './module-placements.controller';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [TypeOrmModule.forFeature([ModulePlacement]), RbacModule],
  controllers: [ModulePlacementsController],
  providers: [ModulePlacementsService],
  exports: [ModulePlacementsService],
})
export class ModulePlacementsModule {}
