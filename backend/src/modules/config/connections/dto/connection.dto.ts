import { IsBoolean, IsEnum, IsISO8601, IsObject, IsOptional, IsString, IsUrl, IsUUID, Length, ValidateIf } from 'class-validator';
import { IntegrationAuthType, IntegrationEnvironment } from '../integration.types';

/**
 * Campos comunes de una conexión. Los secretos van en `credentials` como mapa
 * clave→valor (la plantilla declara cuáles); son de solo escritura.
 */
class ConnectionFieldsDto {
  /** Nombre visible de la conexión (único por empresa). */
  @IsString()
  @Length(1, 120)
  label: string;

  /** Módulo de la app que la consume (`modules.module`, p. ej. `clients`). */
  @IsString()
  @Length(1, 60)
  module: string;

  /** Sistema externo (clave del catálogo `connection_systems`). */
  @IsString()
  @Length(1, 40)
  system: string;

  @IsEnum(IntegrationEnvironment)
  environment: IntegrationEnvironment;

  /** Plantilla del sistema usada para armar el formulario. */
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsEnum(IntegrationAuthType)
  authType?: IntegrationAuthType;

  @IsUrl({ protocols: ['https', 'http'], require_protocol: true, require_tld: false })
  baseUrl: string;

  /** Se valida contra la plantilla y, si hay adaptador, contra su plugin. */
  @IsObject()
  settings: Record<string, unknown>;

  /** Ausente = se conservan las guardadas (solo al editar). */
  @IsOptional()
  @IsObject()
  credentials?: Record<string, string>;

  @IsOptional()
  @ValidateIf((o) => o.expiresAt !== null)
  @IsISO8601()
  expiresAt?: string | null;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class CreateConnectionDto extends ConnectionFieldsDto {}

/** Edición: todos los campos de la parte común pasan a opcionales. */
export class UpdateConnectionDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  label?: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  module?: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  system?: string;

  @IsOptional()
  @IsEnum(IntegrationEnvironment)
  environment?: IntegrationEnvironment;

  @IsOptional()
  @IsUUID()
  templateId?: string | null;

  @IsOptional()
  @IsEnum(IntegrationAuthType)
  authType?: IntegrationAuthType;

  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true, require_tld: false })
  baseUrl?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  credentials?: Record<string, string>;

  @IsOptional()
  @ValidateIf((o) => o.expiresAt !== null)
  @IsISO8601()
  expiresAt?: string | null;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
