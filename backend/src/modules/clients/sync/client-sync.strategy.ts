import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateIf, ValidateNested } from 'class-validator';
import { IntegrationConnection } from '../../config/connections/entities/integration-connection.entity';
import { IntegrationCredentials, IntegrationSystem } from '../../config/connections/integration.types';
import { ClientDocumentType, ClientPersonType } from '../entities/client.entity';

/** Campos de `clients` que una sincronización puede mantener. Por defecto SAP los manda todos. */
export const OWNABLE_CLIENT_FIELDS = ['fullName', 'commercialName', 'legalName', 'billingEmail', 'phone', 'email', 'status'] as const;
export type OwnableClientField = (typeof OWNABLE_CLIENT_FIELDS)[number];

/**
 * Un cliente del sistema externo, ya traducido al vocabulario de la app. Un
 * campo opcional `undefined` = el origen no lo trae (no se toca); `null` = el
 * origen lo tiene vacío.
 */
export interface ExternalClient {
  externalId: string;
  /**
   * `UpdateDate` del registro en el origen (SAP B1 guarda solo la fecha,
   * YYYY-MM-DD). Es la base del incremental por registro: si no es posterior a
   * `client_external_refs.last_synced_at`, el enlace ya está al día y no se toca.
   */
  updateDate?: string | null;
  /** Solo dígitos; NIT completo con DV al final, como se guarda en la app. */
  documentNumber: string;
  documentType: ClientDocumentType;
  personType: ClientPersonType;
  fullName: string;
  commercialName?: string | null;
  legalName?: string | null;
  billingEmail?: string | null;
  phone?: string | null;
  email?: string | null;
  active: boolean;
}

/** Posición de la lectura: `since` es la marca de agua del último job correcto. */
export interface SyncCursor {
  since: string | null;
  skip: number;
}

export interface SyncPage {
  items: ExternalClient[];
  /** null = no hay más páginas. */
  next: SyncCursor | null;
}

export class SyncScheduleDto {
  @IsInt()
  @Min(15)
  @Max(7 * 24 * 60)
  everyMinutes: number;
}

/** Ajustes comunes a toda estrategia de sincronización de clientes (`integration_connections.settings`). */
export class ClientSyncSettingsDto {
  @IsString()
  strategy: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  pageSize?: number;

  /** null o ausente = solo manual. */
  @IsOptional()
  @ValidateIf((o) => o.schedule !== null)
  @ValidateNested()
  @Type(() => SyncScheduleDto)
  schedule?: SyncScheduleDto | null;

  /** Campos que manda el sistema externo; el resto solo se edita en la app. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(OWNABLE_CLIENT_FIELDS, { each: true })
  ownedFields?: OwnableClientField[];
}

/**
 * Lectura de clientes de un sistema externo. Las estrategias no guardan
 * estado: la sesión la abre el worker por job y la recibe cada llamada, así
 * dos empresas sincronizando a la vez nunca comparten sesión. Tampoco leen
 * configuración ni conocen la empresa: todo llega en los argumentos.
 *
 * Es un PUERTO: lo define este módulo genérico (quien lo consume) y lo
 * implementa el adaptador (p. ej. SAP). Aquí no hay nada específico de un sistema.
 */
export interface ClientSyncStrategy<S = unknown> {
  readonly key: string;
  readonly system: IntegrationSystem;
  /** DTO de `settings` de esta estrategia; se valida al guardar la conexión. */
  readonly settingsDto: new () => ClientSyncSettingsDto;
  open(connection: IntegrationConnection, credentials: IntegrationCredentials): Promise<S>;
  close(session: S): Promise<void>;
  fetchPage(session: S, connection: IntegrationConnection, cursor: SyncCursor): Promise<SyncPage>;
}
