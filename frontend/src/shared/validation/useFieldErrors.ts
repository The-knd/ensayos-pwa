import { useCallback, useMemo, useState } from 'react';
import type { FieldStatus } from './fieldState';
import { fieldStatus } from './fieldState';

interface UseFieldErrorsOptions<T extends string> {
  /** Valores actuales de cada campo. */
  values: Record<T, unknown>;
  /** Función que devuelve el mensaje de error de cada campo ('' si es válido). */
  validate: (values: Record<T, unknown>) => Record<T, string>;
  /** Campos obligatorios. */
  required?: T[];
}

interface UseFieldErrorsReturn<T extends string> {
  errors: Record<T, string>;
  touched: Record<T, boolean>;
  status: Record<T, FieldStatus>;
  /** Marca un campo como tocado. */
  touch: (key: T) => void;
  /** Marca todos los campos como tocados. */
  touchAll: () => void;
  /** Resetea el estado de touched. */
  resetTouched: () => void;
  /** Lista de campos con error. */
  invalidKeys: T[];
  /** Lista de campos obligatorios que faltan por llenar. */
  pendingKeys: T[];
  /** true si no hay errores ni campos obligatorios pendientes. */
  isValid: boolean;
}

/**
 * Hook estándar para manejar el estado `touched` y los errores por campo.
 * Elimina la duplicación de `useState` por cada input que existe hoy en la app.
 */
export function useFieldErrors<T extends string>({
  values,
  validate,
  required = [],
}: UseFieldErrorsOptions<T>): UseFieldErrorsReturn<T> {
  const [touched, setTouched] = useState<Record<T, boolean>>(() =>
    Object.keys(values).reduce((acc, k) => ({ ...acc, [k as T]: false }), {} as Record<T, boolean>),
  );

  const errors = useMemo(() => validate(values), [validate, values]);

  const status = useMemo(() => {
    const next = {} as Record<T, FieldStatus>;
    (Object.keys(values) as T[]).forEach((k) => {
      next[k] = fieldStatus({
        required: required.includes(k),
        value: values[k],
        error: errors[k],
        touched: touched[k],
      });
    });
    return next;
  }, [values, errors, touched, required]);

  const touch = useCallback((key: T) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }, []);

  const touchAll = useCallback(() => {
    setTouched((prev) => {
      const next = { ...prev };
      (Object.keys(next) as T[]).forEach((k) => (next[k] = true));
      return next;
    });
  }, []);

  const resetTouched = useCallback(() => {
    setTouched((prev) => {
      const next = { ...prev };
      (Object.keys(next) as T[]).forEach((k) => (next[k] = false));
      return next;
    });
  }, []);

  const invalidKeys = useMemo(
    () => (Object.keys(errors) as T[]).filter((k) => !!errors[k]),
    [errors],
  );

  const pendingKeys = useMemo(
    () => required.filter((k) => isEmpty(values[k]) && !errors[k]),
    [required, values, errors],
  );

  const isValid = invalidKeys.length === 0 && pendingKeys.length === 0;

  return {
    errors,
    touched,
    status,
    touch,
    touchAll,
    resetTouched,
    invalidKeys,
    pendingKeys,
    isValid,
  };
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'number') return Number.isNaN(value);
  if (Array.isArray(value)) return value.length === 0;
  return false;
}
