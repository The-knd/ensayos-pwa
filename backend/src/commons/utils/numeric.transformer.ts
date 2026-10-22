import type { ValueTransformer } from 'typeorm';

/**
 * El driver `pg` devuelve `numeric`/`decimal` como string. Este transformer
 * convierte el valor a `Number` al leer de la base de datos y deja pasar el
 * número tal cual al escribir. Se usa en columnas de dinero para evitar
 * coercionar manualmente en cada consumidor.
 */
export const numericAsNumber: ValueTransformer = {
  to: (value?: number | string | null) => (value == null ? null : value),
  from: (value?: string | number | null) => (value == null ? null : Number(value)),
};

/**
 * Variante para columnas `bigint`. El driver `pg` también devuelve bigint
 * como string; este transformer lo convierte a número al leer.
 */
export const bigintAsNumber: ValueTransformer = {
  to: (value?: number | null) => (value == null ? null : value),
  from: (value?: string | null) => (value == null ? null : Number(value)),
};
