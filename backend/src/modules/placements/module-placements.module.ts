import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module as ModuleEntity } from './entities/module.entity';
import { ModuleAssignment } from './entities/module-assignment.entity';
import { ModuleVariant } from './entities/module-variant.entity';
import { ModulePlacementsService } from './module-placements.service';
import { ModulePlacementsController } from './module-placements.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ModuleEntity, ModuleAssignment, ModuleVariant])],
  controllers: [ModulePlacementsController],
  providers: [ModulePlacementsService],
  exports: [ModulePlacementsService],
})
export class ModulePlacementsModule {}