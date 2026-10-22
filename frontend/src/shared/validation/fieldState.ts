export type FieldStatus = 'idle' | 'pending' | 'invalid' | 'valid';

interface FieldStateOptions {
  required?: boolean;
  value: unknown;
  error?: string;
  touched?: boolean;
}

/**
 * Determina el estado visual de un campo:
 * - `invalid` si hay un mensaje de error (gana sobre todo).
 * - `pending` si es obligatorio y está vacío.
 * - `valid` si se tocó y no hay error.
 * - `idle` en cualquier otro caso.
 */
export function fieldStatus({ required, value, error, touched }: FieldStateOptions): FieldStatus {
  if (error) return 'invalid';
  if (required && isEmpty(value)) return 'pending';
  if (touched) return 'valid';
  return 'idle';
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'number') return Number.isNaN(value);
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Mensaje corto por defecto para campos pendientes. */
export function pendingLabel(label: string): string {
  return `${label} es obligatorio`;
}

/** Convierte un mapa de errores en un array de campos con error. */
export function errorEntries<T extends string>(
  errors: Record<T, string>,
  labels: Record<T, string>,
): { key: T; label: string; message: string }[] {
  return (Object.keys(errors) as T[])
    .filter((k) => !!errors[k])
    .map((k) => ({ key: k, label: labels[k] ?? k, message: errors[k] }));
}

/** Convierte un mapa de valores obligatorios en un array de campos pendientes. */
export function pendingEntries<T extends string>(
  values: Record<T, unknown>,
  labels: Record<T, string>,
): { key: T; label: string }[] {
  return (Object.keys(values) as T[])
    .filter((k) => isEmpty(values[k]))
    .map((k) => ({ key: k, label: labels[k] ?? k }));
}
