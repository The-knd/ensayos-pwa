import { IsString, IsEnum, IsInt, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdatePlacementDto {
  @IsString() @MaxLength(60) @IsOptional()
  key?: string;

  @IsString() @MaxLength(60) @IsOptional()
  module?: string;

  @IsString() @MaxLength(120) @IsOptional()
  label?: string;

  @IsEnum(['grid', 'fab']) @IsOptional()
  placement?: 'grid' | 'fab';

  @IsInt() @IsOptional()
  position?: number;

  @IsString() @MaxLength(200) @IsOptional()
  path?: string;

  @IsString() @MaxLength(100) @IsOptional()
  perm?: string;

  @IsString() @IsOptional() @MaxLength(120)
  flag?: string;

  @IsString() @IsOptional() @MaxLength(500)
  logoUrl?: string;

  @IsBoolean() @IsOptional()
  enabled?: boolean;
}
