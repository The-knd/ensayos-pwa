import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class CreditResultDto {
  @IsIn(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  approvedLimit?: number;
}