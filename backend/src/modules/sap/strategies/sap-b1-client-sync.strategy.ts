import { Injectable } from '@nestjs/common';
import { ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, Length } from 'class-validator';
import { ClientSyncSettingsDto, ClientSyncStrategy, ExternalClient, SyncCursor, SyncPage } from '../../clients/sync/client-sync.strategy';
import { ClientDocumentType, ClientPersonType } from '../../clients/entities/client.entity';
import { IntegrationConnection } from '../../config/connections/entities/integration-connection.entity';
import { IntegrationError } from '../../config/connections/http/integration.errors';
import { IntegrationCredentials } from '../../config/connections/integration.types';
import { SapB1Client, SapB1Session } from '../sap-b1.client';
import { SAP } from '../sap.types';

const DEFAULT_PAGE_SIZE = 200;

export class SapB1ClientSyncSettingsDto extends ClientSyncSettingsDto {
  /** Base de datos de la compañía en SAP B1 (CompanyDB del login). */
  @IsString()
  @Length(1, 100)
  companyDb: string;

  @IsOptional()
  @IsIn(['cCustomer', 'cLid'])
  cardType?: 'cCustomer' | 'cLid';

  /** Solo socios de negocio de estos grupos; vacío = todos. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  groupCodes?: number[];
}

/**
 * Campos que realmente usa la app: CardCode (external_id), nombres, documento,
 * teléfono/correo y el estado. UpdateDate es la marca del incremental.
 */
export interface SapBusinessPartner {
  CardCode: string;
  CardName?: string | null;
  CardForeignName?: string | null;
  FederalTaxID?: string | null;
  Phone1?: string | null;
  EmailAddress?: string | null;
  Valid?: string | null;
  Frozen?: string | null;
  UpdateDate?: string | null;
}

/**
 * Base de la lectura de clientes desde SAP Business One (BusinessPartners).
 *
 * Implementa el puerto `ClientSyncStrategy` (definido en clients/sync): traduce
 * el vocabulario de SAP al de la app. La lógica común vive aquí; lo que cambia
 * por empresa se expone en métodos `protected` para que cada subclase (ver
 * SapEmpresa1ClientSyncStrategy / SapEmpresa2ClientSyncStrategy) sobrescriba
 * solo lo suyo:
 *   - selectFields(): campos del `$select` de OData.
 *   - buildFilters(): filtros `$filter` (tipo de socio, grupos, incremental).
 *   - mapBusinessPartner(): traducción de un BusinessPartner al vocabulario app.
 *
 * Supuesto a confirmar con el SAP real: el NIT de una persona jurídica viene en
 * FederalTaxID con guion antes del DV (900123456-7) y una cédula viene sin
 * guion. Si la localización usa campos de usuario (U_…) para el tipo de
 * documento, se cambia solo `mapBusinessPartner`.
 *
 * Incremental: `$select` trae solo los campos que usa la app y el filtro
 * `UpdateDate ge <marca de agua>` acota la lectura a lo movido desde el último
 * job; el detalle por registro (UpdateDate vs `last_synced_at` del enlace) lo
 * aplica ClientSyncService.
 */
@Injectable()
export class SapB1ClientSyncStrategy implements ClientSyncStrategy<SapB1Session> {
  readonly key: string = 'sap-b1';
  readonly system = SAP;
  readonly settingsDto = SapB1ClientSyncSettingsDto;

  constructor(protected readonly sap: SapB1Client) {}

  open(connection: IntegrationConnection, credentials: IntegrationCredentials): Promise<SapB1Session> {
    if (!('username' in credentials)) {
      throw new IntegrationError('definitive', 'SAP B1 necesita usuario y contraseña');
    }
    const settings = connection.settings as unknown as SapB1ClientSyncSettingsDto;
    return this.sap.login(connection.baseUrl, settings.companyDb, credentials.username, credentials.password);
  }

  close(session: SapB1Session): Promise<void> {
    return this.sap.logout(session);
  }

  async fetchPage(session: SapB1Session, connection: IntegrationConnection, cursor: SyncCursor): Promise<SyncPage> {
    const settings = connection.settings as unknown as SapB1ClientSyncSettingsDto;
    const pageSize = settings.pageSize ?? DEFAULT_PAGE_SIZE;

    const query = [
      `$select=${this.selectFields().join(',')}`,
      `$filter=${encodeURIComponent(this.buildFilters(settings, cursor).join(' and '))}`,
      `$orderby=CardCode`,
      `$top=${pageSize}`,
      `$skip=${cursor.skip}`,
    ].join('&');
    const body = await this.sap.get(session, `BusinessPartners?${query}`, pageSize);
    if (!Array.isArray(body?.value)) {
      throw new IntegrationError('definitive', 'SAP devolvió una respuesta sin "value" en BusinessPartners');
    }
    const rows = body.value as SapBusinessPartner[];
    return {
      items: rows.map((bp) => this.mapBusinessPartner(bp)),
      next: rows.length < pageSize ? null : { since: cursor.since, skip: cursor.skip + rows.length },
    };
  }

  /** Campos del `$select` de OData. */
  protected selectFields(): string[] {
    return ['CardCode', 'CardName', 'CardForeignName', 'FederalTaxID', 'Phone1', 'EmailAddress', 'Valid', 'Frozen', 'UpdateDate'];
  }

  /** Filtros `$filter` de la página (sin el `$select`). */
  protected buildFilters(settings: SapB1ClientSyncSettingsDto, cursor: SyncCursor): string[] {
    const filters = [`CardType eq '${settings.cardType ?? 'cCustomer'}'`];
    if (cursor.since) filters.push(`UpdateDate ge '${cursor.since}'`);
    if (settings.groupCodes?.length) filters.push(`(${settings.groupCodes.map((g) => `GroupCode eq ${g}`).join(' or ')})`);
    return filters;
  }

  /** Traduce un BusinessPartner al vocabulario de la app. */
  protected mapBusinessPartner(bp: SapBusinessPartner): ExternalClient {
    const taxId = (bp.FederalTaxID ?? '').replace(/[\s.]/g, '');
    const juridica = taxId.includes('-');
    const name = (bp.CardName ?? '').trim();
    return {
      externalId: bp.CardCode,
      updateDate: bp.UpdateDate ?? null,
      documentNumber: taxId.replace(/\D/g, ''),
      documentType: juridica ? ClientDocumentType.NIT : ClientDocumentType.CC,
      personType: juridica ? ClientPersonType.JURIDICA : ClientPersonType.NATURAL,
      fullName: name,
      legalName: juridica ? name || null : null,
      commercialName: juridica ? bp.CardForeignName?.trim() || null : null,
      phone: bp.Phone1?.trim() || null,
      email: bp.EmailAddress?.trim() || null,
      active: bp.Valid !== 'tNO' && bp.Frozen !== 'tYES',
    };
  }
}
