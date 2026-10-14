import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsISO8601, IsObject, IsOptional, IsString, IsUrl, Length, ValidateIf, ValidateNested } from 'class-validator';
import { IntegrationAuthType } from '../integration.types';

/**
 * Credenciales, solo escritura. Qué campos van depende de `authType` (lo
 * valida el servicio): token → `token`; basic/session → `username` + `password`.
 */
export class ConnectionCredentialsDto {
  @IsOptional()
  @IsString()
  @Length(1, 4096)
  token?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  username?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  password?: string;
}

/**
 * PUT /integrations/companies/:companyId/:system/:environment.
 * La empresa, el sistema y el entorno van en la ruta; el autor sale del token.
 */
export class UpsertConnectionDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsEnum(IntegrationAuthType)
  authType: IntegrationAuthType;

  @IsUrl({ protocols: ['https'], require_protocol: true, require_tld: false })
  baseUrl: string;

  /** Se valida contra el DTO de la estrategia indicada en `settings.strategy` (ver IntegrationConnectionsService). */
  @IsObject()
  settings: Record<string, unknown>;

  /** Ausente = se conservan las guardadas. */
  @IsOptional()
  @ValidateNested()
  @Type(() => ConnectionCredentialsDto)
  credentials?: ConnectionCredentialsDto;

  @IsOptional()
  @ValidateIf((o) => o.expiresAt !== null)
  @IsISO8601()
  expiresAt?: string | null;
}
