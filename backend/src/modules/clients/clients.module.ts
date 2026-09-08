import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { ClientDirection } from './entities/client-direction.entity';
import { ClientReference } from './entities/client-reference.entity';
import { ClientTaxSettings } from './entities/client-tax.entity';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';

@Module({
  imports: [TypeOrmModule.forFeature([Client, ClientDirection, ClientReference, ClientTaxSettings]), FeatureFlagsModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
