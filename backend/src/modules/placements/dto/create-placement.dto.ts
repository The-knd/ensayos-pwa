import { IsString, IsEnum, IsInt, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreatePlacementDto {
  @IsString() @MaxLength(60)
  key: string;

  @IsString() @MaxLength(60)
  module: string;

  @IsString() @MaxLength(120)
  label: string;

  @IsEnum(['grid', 'fab'])
  placement: 'grid' | 'fab';

  @IsInt() @IsOptional()
  position?: number;

  @IsString() @MaxLength(200)
  path: string;

  @IsString() @MaxLength(100)
  perm: string;

  @IsString() @IsOptional() @MaxLength(120)
  flag?: string;

  @IsString() @IsOptional() @MaxLength(500)
  logoUrl?: string;

  @IsBoolean() @IsOptional()
  enabled?: boolean;
}
