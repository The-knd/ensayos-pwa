import { IsString, IsOptional, Length, MaxLength, IsBoolean, IsEnum, Matches } from 'class-validator';
import { AuthStrategyType } from '../entities/company.entity';

export class CreateCompanyDto {
  @IsString()
  @Length(1, 150)
  name: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'primaryColor debe tener formato #RRGGBB' })
  primaryColor?: string;

  @IsOptional()
  @IsEnum(AuthStrategyType)
  authStrategy?: AuthStrategyType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;
}

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @Length(1, 150)
  name?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'primaryColor debe tener formato #RRGGBB' })
  primaryColor?: string;

  @IsOptional()
  @IsEnum(AuthStrategyType)
  authStrategy?: AuthStrategyType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;
}