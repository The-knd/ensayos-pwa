import { Injectable } from '@nestjs/common';
import { SapB1ClientSyncStrategy } from './sap-b1-client-sync.strategy';

/**
 * Lectura de clientes de SAP para la empresa 1.
 *
 * Es un punto de extensión: hereda toda la base (login, paginación OData,
 * incremental por UpdateDate) y solo cambia lo que sea distinto para esta
 * empresa sobrescribiendo `selectFields()`, `buildFilters()` o
 * `mapBusinessPartner()`.
 *
 * La empresa sabe qué estrategia usar por el `settings.strategy` de SU conexión
 * (`integration_connections`), así que aquí no se codifica ningún companyId.
 * Registrada por SapIntegrationRegistrar con `key = 'sap-b1-empresa1'`.
 */
@Injectable()
export class SapEmpresa1ClientSyncStrategy extends SapB1ClientSyncStrategy {
  readonly key = 'sap-b1-empresa1';
}
