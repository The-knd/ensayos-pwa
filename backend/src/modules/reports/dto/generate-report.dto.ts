import { IsIn, IsOptional } from 'class-validator';

export class GenerateReportDto {
  @IsOptional()
  @IsIn(['csv', 'pdf'])
  formato: 'csv' | 'pdf' = 'csv';
}