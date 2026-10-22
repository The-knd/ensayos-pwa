import { useRef, type ChangeEvent, type FocusEvent } from 'react';
import { formatMoneyInput, sanitizeMoneyInput } from '../utils/format';

interface CurrencyInputProps {
  id?: string;
  value: string;
  onChange: (raw: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  maxDecimals?: number;
  maxIntegerDigits?: number;
}

/**
 * Input de moneda en pesos colombianos.
 *
 * - El símbolo "$" siempre está visible.
 * - Acepta punto y coma como separador decimal según el teclado del usuario.
 * - Muestra los separadores de miles mientras se escribe.
 * - Emite al `onChange` una string numérica normalizada ("5000000.50") para
 *   que el consumidor pueda hacer `Number(value)` sin problemas.
 */
export function CurrencyInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder = 'Ej. 5.000.000',
  disabled,
  invalid,
  ariaLabel,
  ariaDescribedBy,
  maxDecimals = 2,
  maxIntegerDigits = 12,
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = formatMoneyInput(value, maxDecimals);
  const hasValue = displayValue !== '';

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const raw = el.value;
    const caret = el.selectionStart ?? raw.length;

    // Cuenta los dígitos que había antes del cursor para poder restablecerlo.
    const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, '').length;
    const normalized = sanitizeMoneyInput(raw, maxDecimals);

    // Límite de dígitos enteros.
    const [intPart] = normalized.split('.');
    if (intPart && intPart.length > maxIntegerDigits) {
      return;
    }

    onChange(normalized);

    // Restaurar posición del cursor tras el formateo.
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      const formatted = formatMoneyInput(normalized, maxDecimals);
      let target = formatted.length;
      if (digitsBeforeCaret > 0) {
        let digits = 0;
        for (let i = 0; i < formatted.length; i += 1) {
          if (/\d/.test(formatted[i])) {
            digits += 1;
            if (digits === digitsBeforeCaret) {
              target = i + 1;
              break;
            }
          }
        }
      }
      input.setSelectionRange(target, target);
    });
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    // Normaliza de nuevo al salir, por si el usuario dejó un separador colgado.
    const normalized = sanitizeMoneyInput(e.target.value, maxDecimals);
    if (normalized !== value) {
      onChange(normalized);
    }
    onBlur?.();
  };

  return (
    <div className={`inp${invalid ? ' is-invalid' : ''}`}>
      <span className="cur-sym" aria-hidden="true">
        $
      </span>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid}
        autoComplete="off"
        style={{
          fontVariantNumeric: 'tabular-nums',
          color: hasValue ? 'var(--ink)' : 'var(--faint)',
        }}
      />
    </div>
  );
}
