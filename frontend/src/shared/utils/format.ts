const COP_CURRENCY = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const MONEY_FORMAT = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCOP(value: number): string {
  return COP_CURRENCY.format(value);
}

/** Formatea un valor numérico con separadores de miles y hasta 2 decimales. */
export function formatMoney(value: number | string | null | undefined): string {
  if (value == null || value === '') return '$ —';
  const n = typeof value === 'string' ? Number(value.replace(/\./g, '').replace(',', '.')) : value;
  if (Number.isNaN(n)) return '$ —';
  return `$ ${MONEY_FORMAT.format(n)}`;
}

/**
 * Convierte una string cruda (p.ej. "5000000.50") en formato visual
 * "5.000.000,50" para mostrar dentro del input.
 */
export function formatMoneyInput(raw: string, maxDecimals = 2): string {
  const normalized = sanitizeMoneyInput(raw, maxDecimals);
  if (normalized === '') return '';
  const [intPart, decPart] = normalized.split('.');
  const intFormatted = Number(intPart).toLocaleString('es-CO');
  return decPart !== undefined ? `${intFormatted},${decPart}` : intFormatted;
}

/**
 * Limpia cualquier texto ingresado y devuelve una string numérica normalizada
 * con punto decimal. Ejemplos:
 * - "5.000.000,50" → "5000000.50"
 * - "5000000.50"   → "5000000.50"
 * - "5,000,000"    → "5000000"
 */
export function sanitizeMoneyInput(value: string, maxDecimals = 2): string {
  if (value == null) return '';
  const cleaned = value.replace(/[^\d.,]/g, '');
  if (!cleaned) return '';

  // Si el texto encaja en grupos de miles (p.ej. "5.000.000" o "5,000,000"),
  // todos los separadores son de miles.
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return cleaned.replace(/\./g, '');
  }
  if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
    return cleaned.replace(/,/g, '');
  }

  // Si no, el último separador es decimal y el resto son de miles.
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  const lastSep = Math.max(lastDot, lastComma);

  if (lastSep === -1) {
    return cleaned;
  }

  const sep = cleaned[lastSep];
  const parts = cleaned.split(sep);
  const integer = parts.slice(0, -1).join('').replace(/[.,]/g, '');
  let fraction = parts[parts.length - 1].replace(/[.,]/g, '');
  if (fraction.length > maxDecimals) fraction = fraction.slice(0, maxDecimals);

  return fraction ? `${integer}.${fraction}` : integer;
}

/** Convierte una string formateada en español a número. */
export function parseMoneyInput(value: string): number {
  return Number(sanitizeMoneyInput(value));
}

export function productImage(code: string): string {
  return `/products/${code}.png`;
}
