import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialsCipher } from '../../commons/crypto/credentials.cipher';
import { IntegrationsAdminController } from './admin/integrations-admin.controller';
import { ClientExternalRef } from './entities/client-external-ref.entity';
import { IntegrationConnection } from './entities/integration-connection.entity';
import { IntegrationJob } from './entities/integration-job.entity';
import { IntegrationHttpClient } from './http/integration-http.client';
import { IntegrationConnectionsService } from './integration-connections.service';
import { IntegrationJobsService } from './integration-jobs.service';
import { SapB1Client } from './sap/sap-b1.client';
import { CLIENT_SYNC_STRATEGIES, ClientSyncStrategy } from './sync/client-sync.strategy';
import { ClientSyncStrategyRegistry } from './sync/client-sync-strategy.registry';
import { ClientSyncService } from './sync/client-sync.service';
import { ClientSyncWorker } from './sync/client-sync.worker';
import { SapB1ClientSyncStrategy } from './sync/sap-b1-client-sync.strategy';

/**
 * Integraciones con sistemas externos: conexiones por empresa con credenciales
 * cifradas, y sincronización de clientes en segundo plano. Es configuración del
 * superadmin: sin fila en `modules`, sin permisos propios ni entrada en el
 * registro del frontend (se administra desde Configuración global).
 *
 * Estrategia nueva: añadirla a `providers` y al `inject` de CLIENT_SYNC_STRATEGIES.
 */
@Module({
  imports: [TypeOrmModule.forFeature([IntegrationConnection, IntegrationJob, ClientExternalRef])],
  controllers: [IntegrationsAdminController],
  providers: [
    CredentialsCipher,
    IntegrationHttpClient,
    SapB1Client,
    SapB1ClientSyncStrategy,
    {
      provide: CLIENT_SYNC_STRATEGIES,
      useFactory: (...all: ClientSyncStrategy[]) => all,
      inject: [SapB1ClientSyncStrategy],
    },
    ClientSyncStrategyRegistry,
    IntegrationConnectionsService,
    IntegrationJobsService,
    ClientSyncService,
    ClientSyncWorker,
  ],
})
export class IntegrationsModule {}
