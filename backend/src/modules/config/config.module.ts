import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { ConfigService as AppConfigService } from './config.service';
import { ConfigController } from './config.controller';
import { UploadsController } from './uploads.controller';
import { ModulePlacementsModule } from '../placements/module-placements.module';

@Module({
  imports: [TypeOrmModule.forFeature([Company]), ModulePlacementsModule],
  controllers: [ConfigController, UploadsController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigModule {}
