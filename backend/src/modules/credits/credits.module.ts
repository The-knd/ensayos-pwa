import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credit } from './entities/credit.entity';
import { CreditDocument } from './entities/credit-document.entity';
import { CreditsService } from './credits.service';
import { CreditScoringService } from './credit-scoring.service';
import { CreditsController } from './credits.controller';
import { ClientsModule } from '../clients/clients.module';
import { IdempotencyInterceptor } from '../../commons/interceptors/idempotency.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([Credit, CreditDocument]), ClientsModule],
  controllers: [CreditsController],
  providers: [CreditsService, CreditScoringService, IdempotencyInterceptor],
  exports: [CreditsService],
})
export class CreditsModule {}