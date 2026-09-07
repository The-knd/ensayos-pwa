import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credit } from './entities/credit.entity';
import { CreditDocument } from './entities/credit-document.entity';
import { Client } from '../clients/entities/client.entity';
import { CreditsService } from './credits.service';
import { CreditsController } from './credits.controller';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [TypeOrmModule.forFeature([Credit, CreditDocument, Client]), RbacModule],
  controllers: [CreditsController],
  providers: [CreditsService],
  exports: [CreditsService],
})
export class CreditsModule {}
