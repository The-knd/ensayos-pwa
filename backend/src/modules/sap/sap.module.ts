import { Module } from '@nestjs/common';
import { ClientSyncModule } from '../clients/sync/client-sync.module';
import { ConnectionsModule } from '../config/connections/connections.module';
import { SapConnectionPlugin } from './SapConnectionPlugin';
import { SapB1Client } from './sap-b1.client';
import { SapIntegrationRegistrar } from './sap-integration.registrar';
import { SapB1ClientSyncStrategy } from './strategies/sap-b1-client-sync.strategy';
import { SapEmpresa1ClientSyncStrategy } from './strategies/sap-empresa1-client-sync.strategy';
import { SapEmpresa2ClientSyncStrategy } from './strategies/sap-empresa2-client-sync.strategy';

/**
 * Adaptador SAP Business One: implementa los dos puertos genéricos.
 *
 * - `ConnectionPlugin` (SapConnectionPlugin) → `config/connections`.
 * - `ClientSyncStrategy` (SapB1ClientSyncStrategy y sus variantes por empresa)
 *   → `clients/sync`.
 *
 * Este módulo es el único que conoce ambos mundos; `SapIntegrationRegistrar` los
 * da de alta al arrancar. Estrategia nueva (por empresa): añadirla a `providers`
 * y a la lista del registrar; cada empresa elige la suya con el
 * `settings.strategy` de su conexión.
 */
@Module({
  imports: [ConnectionsModule, ClientSyncModule],
  providers: [
    SapB1Client,
    SapB1ClientSyncStrategy,
    SapEmpresa1ClientSyncStrategy,
    SapEmpresa2ClientSyncStrategy,
    SapConnectionPlugin,
    SapIntegrationRegistrar,
  ],
})
export class SapModule {}
