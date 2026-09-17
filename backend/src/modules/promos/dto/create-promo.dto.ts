import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreatePromoDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  descuento: number;
}