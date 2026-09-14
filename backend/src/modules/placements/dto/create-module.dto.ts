import {
  IsString,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OperationItemDto {
  @IsString()
  @MaxLength(60)
  action: string;

  @IsString()
  @MaxLength(80)
  name: string;
}

export class CreateModuleDto {
  @IsUUID(undefined, { message: 'companyId debe ser un UUID válido' })
  @IsOptional()
  companyId?: string;

  @IsBoolean()
  @IsOptional()
  global?: boolean;

  @IsString()
  @MaxLength(60)
  key: string;

  @IsString()
  @MaxLength(60)
  module: string;

  @IsString()
  @MaxLength(120)
  label: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  icon?: string;

  @IsString()
  @MaxLength(200)
  path: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationItemDto)
  operations: OperationItemDto[];
}