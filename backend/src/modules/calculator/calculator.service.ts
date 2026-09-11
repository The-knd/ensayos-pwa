import { Injectable } from '@nestjs/common';
import { SumDto } from './dto/sum.dto';

@Injectable()
export class CalculatorService {
  sum(dto: SumDto): { result: number; expression: string } {
    const result = Number(dto.a) + Number(dto.b);
    return { result, expression: `${dto.a} + ${dto.b} = ${result}` };
  }
}