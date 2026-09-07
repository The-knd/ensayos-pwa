import { Type } from 'class-transformer';
import { IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateCreditDto {
  @IsUUID()
  clientId: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  requestedAmount: number;
}