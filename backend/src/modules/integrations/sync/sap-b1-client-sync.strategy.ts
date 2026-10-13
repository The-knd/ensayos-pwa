import { Injectable } from '@nestjs/common';
import { ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, Length } from 'class-validator';
import { ClientDocumentType, ClientPersonType } from '../../clients/entities/client.entity';
import { IntegrationConnection } from '../entities/integration-connection.entity';
import { IntegrationError } from '../http/integration.errors';
import { IntegrationCredentials, IntegrationSystem } from '../integration.types';
import { SapB1Client, SapB1Session } from '../sap/sap-b1.client';
import { ClientSyncSettingsDto, ClientSyncStrategy, ExternalClient, SyncCursor, SyncPage } from './client-sync.strategy';

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

interface SapBusinessPartner {
  CardCode: string;
  CardName?: string | null;
  CardForeignName?: string | null;
  FederalTaxID?: string | null;
  Phone1?: string | null;
  EmailAddress?: string | null;
  Valid?: string | null;
  Frozen?: string | null;
}

/**
 * Clientes desde SAP Business One (BusinessPartners).
 *
 * Supuesto a confirmar con el SAP real: el NIT de una persona jurídica viene en
 * FederalTaxID con guion antes del DV (900123456-7) y una cédula viene sin
 * guion. Si la localización usa campos de usuario (U_…) para el tipo de
 * documento, se cambia solo `toExternal`.
 *
 * Incremental: con marca de agua trae `UpdateDate ge <fecha>` (SAP guarda solo
 * la fecha, así que se repiten los del mismo día; el hash de origen evita
 * reescribirlos).
 */
@Injectable()
export class SapB1ClientSyncStrategy implements ClientSyncStrategy<SapB1Session> {
  readonly key = 'sap-b1';
  readonly system = IntegrationSystem.SAP;
  readonly settingsDto = SapB1ClientSyncSettingsDto;

  constructor(private readonly sap: SapB1Client) {}

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
    const filters = [`CardType eq '${settings.cardType ?? 'cCustomer'}'`];
    if (cursor.since) filters.push(`UpdateDate ge '${cursor.since}'`);
    if (settings.groupCodes?.length) filters.push(`(${settings.groupCodes.map((g) => `GroupCode eq ${g}`).join(' or ')})`);

    const query = [
      `$select=CardCode,CardName,CardForeignName,FederalTaxID,Phone1,EmailAddress,Valid,Frozen`,
      `$filter=${encodeURIComponent(filters.join(' and '))}`,
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
      items: rows.map(toExternal),
      next: rows.length < pageSize ? null : { since: cursor.since, skip: cursor.skip + rows.length },
    };
  }
}

function toExternal(bp: SapBusinessPartner): ExternalClient {
  const taxId = (bp.FederalTaxID ?? '').replace(/[\s.]/g, '');
  const juridica = taxId.includes('-');
  const name = (bp.CardName ?? '').trim();
  return {
    externalId: bp.CardCode,
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
