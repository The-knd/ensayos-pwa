import { Injectable } from '@nestjs/common';
import { SapB1ClientSyncStrategy } from './sap-b1-client-sync.strategy';

/**
 * Lectura de clientes de SAP para la empresa 2.
 *
 * Igual que SapEmpresa1ClientSyncStrategy: hereda la base y solo sobrescribe
 * `selectFields()`, `buildFilters()` o `mapBusinessPartner()` con lo que
 * difiera para esta empresa. La estrategia se elige por el `settings.strategy`
 * de la conexión de cada empresa (no por companyId en código).
 * Registrada en SapModule (CLIENT_SYNC_STRATEGIES) con `key = 'sap-b1-empresa2'`.
 */
@Injectable()
export class SapEmpresa2ClientSyncStrategy extends SapB1ClientSyncStrategy {
  readonly key = 'sap-b1-empresa2';
}
