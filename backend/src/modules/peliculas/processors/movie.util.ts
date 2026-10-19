import { IntegrationError } from '../../config/connections/http/integration.errors';
import { Movie } from '../peliculas.types';

/**
 * Convierte un registro crudo (claves ya normalizadas por cada estrategia) en
 * una `Movie`, tolerando campos opcionales. Lanza un error de formato —que la
 * UI muestra— si el registro no trae identificador.
 */
export function toMovie(source: Record<string, unknown>): Movie {
  const id = source.id;
  if (id === undefined || id === null || id === '') {
    throw new IntegrationError('definitive', 'El API devolvió una película sin identificador');
  }
  return {
    id: String(id),
    title: source.title === undefined || source.title === null ? '' : String(source.title),
    year: toNumberOrNull(source.year),
    genre: source.genre === undefined || source.genre === null ? null : String(source.genre),
  };
}

function toNumberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/** Exige que `raw` sea un objeto; si no, error de formato legible. */
export function asObject(raw: unknown, expected: string): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new IntegrationError('definitive', `Formato inesperado del API: se esperaba ${expected}`);
  }
  return raw as Record<string, unknown>;
}
