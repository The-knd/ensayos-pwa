import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class StudyCreditDto {
  @IsUUID()
  clientId: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  requestedAmount?: number;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  nit?: string;

  @IsOptional()
  @IsBoolean()
  consentData?: boolean;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  monthlyIncome?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  monthlyExpenses?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  assetsValue?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  liabilitiesValue?: number;

  @IsOptional()
  @IsString()
  foundationDate?: string;
}