import { AsyncLocalStorage } from 'async_hooks';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  companyId?: string | null;
}

/**
 * Contexto por request propagado vía AsyncLocalStorage: correlationId y el
 * usuario/empresa autenticados se inyectan en cada entrada de log sin tener
 * que pasar el Request por todas las capas.
 */
export const logContext = new AsyncLocalStorage<LogContext>();