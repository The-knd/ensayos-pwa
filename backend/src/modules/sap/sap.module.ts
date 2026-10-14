import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyThrottlerGuard } from '../../commons/guards/company-throttler.guard';
import { CredentialsCipher } from '../../commons/crypto/credentials.cipher';
import { IntegrationsAdminController } from './admin/integrations-admin.controller';
import { SapClientsController } from './clients/sap-clients.controller';
import { SapSyncService } from './clients/sap-sync.service';
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
import { ClientSyncRunner } from './sync/client-sync-runner.service';
import { ClientSyncWorker } from './sync/client-sync.worker';
import { SapB1ClientSyncStrategy } from './sync/sap-b1-client-sync.strategy';
import { SapEmpresa1ClientSyncStrategy } from './sync/sap-empresa1-client-sync.strategy';
import { SapEmpresa2ClientSyncStrategy } from './sync/sap-empresa2-client-sync.strategy';

/**
 * Módulo SAP: conexiones por empresa con credenciales cifradas y sincronización
 * de clientes desde SAP Business One.
 *
 * - La administración de conexiones (IntegrationsAdminController, ruta
 *   /integrations) es configuración del superadmin: sin fila en `modules` ni
 *   permisos propios.
 * - El disparo de "sincronizar ahora" para un usuario de empresa vive en
 *   SapClientsController (ruta /clients/sap), con permiso clients.update.
 *
 * Estrategia nueva (por empresa): añadirla a `providers` y al `inject` de
 * CLIENT_SYNC_STRATEGIES. Cada empresa elige la suya con el `settings.strategy`
 * de su conexión.
 */
@Module({
  imports: [TypeOrmModule.forFeature([IntegrationConnection, IntegrationJob, ClientExternalRef])],
  controllers: [IntegrationsAdminController, SapClientsController],
  providers: [
    CredentialsCipher,
    IntegrationHttpClient,
    SapB1Client,
    SapB1ClientSyncStrategy,
    SapEmpresa1ClientSyncStrategy,
    SapEmpresa2ClientSyncStrategy,
    {
      provide: CLIENT_SYNC_STRATEGIES,
      useFactory: (...all: ClientSyncStrategy[]) => all,
      inject: [SapB1ClientSyncStrategy, SapEmpresa1ClientSyncStrategy, SapEmpresa2ClientSyncStrategy],
    },
    ClientSyncStrategyRegistry,
    IntegrationConnectionsService,
    IntegrationJobsService,
    ClientSyncService,
    ClientSyncRunner,
    ClientSyncWorker,
    SapSyncService,
    CompanyThrottlerGuard,
  ],
})
export class SapModule {}
