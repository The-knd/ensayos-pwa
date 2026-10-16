import { Injectable } from '@nestjs/common';
import { ClientSyncStrategyRegistry } from '../clients/sync/client-sync-strategy.registry';
import { ConnectionPlugin } from '../config/connections/connection-plugins';
import { IntegrationConnection } from '../config/connections/entities/integration-connection.entity';
import { IntegrationCredentials } from '../config/connections/integration.types';
import { SAP } from './sap.types';

/**
 * Adaptador de conexión de SAP: implementa el puerto `ConnectionPlugin` que
 * define `config/connections`.
 *
 * - `validateSettings` delega en el registro de estrategias de sincronización:
 *   los ajustes de una conexión SAP son, precisamente, los de su estrategia
 *   (companyDb, pageSize, schedule, ownedFields…). Este es el único punto donde
 *   el adaptador conoce a la vez su puerto de conexión y su puerto de clientes.
 * - `test` abre y cierra una sesión con la estrategia elegida; no ejecuta la
 *   sincronización completa.
 */
@Injectable()
export class SapConnectionPlugin implements ConnectionPlugin {
  readonly system = SAP;

  constructor(private readonly strategies: ClientSyncStrategyRegistry) {}

  validateSettings(settings: Record<string, unknown>): Record<string, unknown> {
    return this.strategies.validateSettings(this.system, settings);
  }

  async test(connection: IntegrationConnection, credentials: IntegrationCredentials): Promise<void> {
    const strategy = this.strategies.resolve(this.system, connection.settings.strategy as string);
    const session = await strategy.open(connection, credentials);
    await strategy.close(session);
  }
}
