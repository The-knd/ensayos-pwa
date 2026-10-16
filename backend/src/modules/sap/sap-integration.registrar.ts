import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientSyncStrategyRegistry } from '../clients/sync/client-sync-strategy.registry';
import { ConnectionPluginsRegistry } from '../config/connections/connection-plugins';
import { SapConnectionPlugin } from './SapConnectionPlugin';
import { SapB1ClientSyncStrategy } from './strategies/sap-b1-client-sync.strategy';
import { SapEmpresa1ClientSyncStrategy } from './strategies/sap-empresa1-client-sync.strategy';
import { SapEmpresa2ClientSyncStrategy } from './strategies/sap-empresa2-client-sync.strategy';

/**
 * Da de alta los adaptadores de SAP en los registros genéricos al arrancar:
 * el plugin de conexión y las estrategias de sincronización de clientes.
 *
 * Con esto, una estrategia nueva se registra añadiéndola a `providers` de
 * SapModule y a la lista de abajo; ni `config/connections` ni `clients/sync`
 * cambian.
 */
@Injectable()
export class SapIntegrationRegistrar implements OnModuleInit {
  constructor(
    private readonly plugins: ConnectionPluginsRegistry,
    private readonly strategies: ClientSyncStrategyRegistry,
    private readonly plugin: SapConnectionPlugin,
    private readonly base: SapB1ClientSyncStrategy,
    private readonly empresa1: SapEmpresa1ClientSyncStrategy,
    private readonly empresa2: SapEmpresa2ClientSyncStrategy,
  ) {}

  onModuleInit() {
    this.plugins.register(this.plugin);
    for (const strategy of [this.base, this.empresa1, this.empresa2]) {
      this.strategies.register(strategy);
    }
  }
}
