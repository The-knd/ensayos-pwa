/**
 * Por qué falló una llamada a un sistema externo (mismo criterio que SamanError):
 *   auth        401/403: credencial rechazada. Reintentar con la misma fallaría
 *               igual (y podría bloquear el usuario): se pausa esa empresa.
 *   transient   red, timeout, 5xx, 429, 408: se reintenta con espera creciente.
 *   definitive  otros 4xx, respuesta inesperada o credencial que no descifra: no se reintenta.
 */
export type IntegrationErrorType = 'auth' | 'transient' | 'definitive';

export class IntegrationError extends Error {
  constructor(
    readonly type: IntegrationErrorType,
    message: string,
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

/** Clasifica un status HTTP no exitoso. */
export function classifyHttpStatus(status: number): IntegrationErrorType {
  if (status === 401 || status === 403) return 'auth';
  if (status >= 500 || status === 429 || status === 408) return 'transient';
  return 'definitive';
}
