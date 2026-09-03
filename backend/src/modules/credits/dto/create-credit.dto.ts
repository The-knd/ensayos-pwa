import { IsString, IsNumber, IsPositive } from 'class-validator';

export class CreateCreditDto {
  @IsString()
  clientId: string;

  @IsNumber()
  @IsPositive()
  requestedAmount: number;
}
