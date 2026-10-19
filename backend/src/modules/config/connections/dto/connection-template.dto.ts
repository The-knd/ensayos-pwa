import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsIn, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { IntegrationAuthType } from '../integration.types';

const FIELD_TYPES = ['text', 'number', 'boolean', 'json', 'select', 'multiselect'] as const;

class ConnectionFieldDto {
  @IsString()
  @Length(1, 60)
  key: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  label?: string;

  @IsOptional()
  @IsIn(FIELD_TYPES)
  type?: (typeof FIELD_TYPES)[number];

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  default?: unknown;

  @IsOptional()
  @IsBoolean()
  operational?: boolean;
}

class ConnectionSecretDto {
  @IsString()
  @Length(1, 60)
  key: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  label?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

/** PUT/POST de una plantilla de conexión (superadmin). */
export class UpsertConnectionTemplateDto {
  @IsString()
  @Length(1, 40)
  systemKey: string;

  @IsString()
  @Length(1, 120)
  label: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConnectionFieldDto)
  settingsFields: ConnectionFieldDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConnectionSecretDto)
  secretFields: ConnectionSecretDto[];

  @IsOptional()
  @IsEnum(IntegrationAuthType)
  authType?: IntegrationAuthType;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

/** Alta de un sistema en el catálogo (opcional; la plantilla también lo autocrea). */
export class UpsertConnectionSystemDto {
  @IsString()
  @Length(1, 40)
  key: string;

  @IsString()
  @Length(1, 120)
  label: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
