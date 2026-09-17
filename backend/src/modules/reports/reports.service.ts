import { Injectable } from '@nestjs/common';
import { GenerateReportDto } from './dto/generate-report.dto';

export interface ReportSummary {
  creditos: number;
  clientes: number;
  enCobranza: number;
}

@Injectable()
export class ReportsService {
  dashboard(): ReportSummary {
    return { creditos: 128, clientes: 76, enCobranza: 9 };
  }

  generate(dto: GenerateReportDto): { url: string; rows: number; formato: string } {
    return { url: '/reports/exporte.csv', rows: 128, formato: dto.formato };
  }
}