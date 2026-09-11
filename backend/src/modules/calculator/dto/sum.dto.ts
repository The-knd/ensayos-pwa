import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class SumDto {
  @IsNumber()
  @Type(() => Number)
  a: number;

  @IsNumber()
  @Type(() => Number)
  b: number;
}