import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyThrottlerGuard } from '../../../commons/guards/company-throttler.guard';
import { ConnectionsModule } from '../../config/connections/connections.module';
import { ClientSyncController } from './client-sync.controller';
import { ClientSyncRunner } from './client-sync-runner.service';
import { ClientSyncService } from './client-sync.service';
import { ClientSyncStrategyRegistry } from './client-sync-strategy.registry';
import { ClientSyncTriggerService } from './client-sync-trigger.service';
import { ClientSyncWorker } from './client-sync.worker';
import { ClientExternalRef } from './entities/client-external-ref.entity';
import { IntegrationJob } from './entities/integration-job.entity';
import { IntegrationJobsService } from './jobs/integration-jobs.service';

/**
 * Sincronización de clientes: estrategias (puerto `ClientSyncStrategy`), cola de
 * jobs, worker programado y disparo manual. No conoce ningún sistema concreto:
 * recibe las implementaciones por el registro de estrategias.
 *
 * Exporta el registro (lo puebla el adaptador en su `onModuleInit`) y el runner
 * (por si otro módulo necesita ejecutar un job).
 */
@Module({
  imports: [ConnectionsModule, TypeOrmModule.forFeature([IntegrationJob, ClientExternalRef])],
  controllers: [ClientSyncController],
  providers: [
    ClientSyncStrategyRegistry,
    ClientSyncService,
    ClientSyncRunner,
    ClientSyncWorker,
    ClientSyncTriggerService,
    IntegrationJobsService,
    CompanyThrottlerGuard,
  ],
  exports: [ClientSyncStrategyRegistry, ClientSyncRunner, IntegrationJobsService],
})
export class ClientSyncModule {}
