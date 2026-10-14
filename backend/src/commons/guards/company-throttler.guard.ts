import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** Disparos por empresa dentro de la ventana (operaciones pesadas: sincronización). */
const PER_COMPANY_LIMIT = 3;
const WINDOW_MS = 60_000;

/**
 * Límite por EMPRESA (no por IP). Debe ir DESPUÉS de JwtAuthGuard: el tracker
 * lee `req.user.companyId`, que solo existe una vez autenticado.
 *
 * Usa un throttler propio ("company") para no mezclarse con el "default" global
 * (ThrottlerGuard por IP, 300/min): al no compartir nombre, cada uno lleva su
 * contador y este añade 3/min por empresa sin endurecer el límite por IP.
 *
 * El contador es in-memory por proceso; con varias réplicas no se comparte.
 */
@Injectable()
export class CompanyThrottlerGuard extends ThrottlerGuard {
  async onModuleInit(): Promise<void> {
    this.throttlers = [{ name: 'company', ttl: WINDOW_MS, limit: PER_COMPANY_LIMIT }];
    this.commonOptions = {
      getTracker: this.getTracker.bind(this),
      generateKey: this.generateKey.bind(this),
    };
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.user?.companyId ?? req.ip;
  }
}
