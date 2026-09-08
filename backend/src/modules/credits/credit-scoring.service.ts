import { Injectable } from '@nestjs/common';
import { Credit } from './entities/credit.entity';

export interface CreditScoringResult {
  decision: 'approved' | 'rejected';
  approvedLimit?: number;
  reason: string;
}

/**
 * Mockup del algoritmo de aprobación de crédito. Extraído de CreditsService
 * para que la lógica de "negocio de scoring" (hoy simple, candidata a crecer)
 * no viva mezclada con la orquestación CRUD de créditos.
 */
@Injectable()
export class CreditScoringService {
  private static readonly APPROVED_LIMIT = 2_000_000;

  computeMockup(credit: Credit): CreditScoringResult {
    const income = Number(credit.monthlyIncome ?? 0);
    const expenses = Number(credit.monthlyExpenses ?? 0);
    const assets = Number(credit.assetsValue ?? 0);
    const liabilities = Number(credit.liabilitiesValue ?? 0);
    const capacity = income - expenses;

    if (income <= 0) {
      return { decision: 'rejected', reason: 'No se registraron ingresos mensuales.' };
    }
    if (capacity <= 0) {
      return { decision: 'rejected', reason: 'La capacidad de pago es insuficiente (egresos superan ingresos).' };
    }
    if (liabilities > assets) {
      return { decision: 'rejected', reason: 'Los pasivos superan los activos del solicitante.' };
    }

    return {
      decision: 'approved',
      approvedLimit: CreditScoringService.APPROVED_LIMIT,
      reason: `Capacidad de pago mensual $${capacity.toLocaleString('es-CO')}. Cupo aprobado de $${CreditScoringService.APPROVED_LIMIT.toLocaleString('es-CO')}.`,
    };
  }
}
