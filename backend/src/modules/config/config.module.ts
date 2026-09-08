import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { ConfigService as AppConfigService } from './config.service';
import { ConfigController } from './config.controller';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  controllers: [ConfigController, UploadsController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigModule {}
