import type { ReactNode } from 'react';

interface SummaryItem {
  key: string;
  label: string;
  message?: string;
}

interface FormSummaryProps {
  /** Campos obligatorios que aún están vacíos. */
  pending: SummaryItem[];
  /** Campos con error de validación. */
  errors: SummaryItem[];
  /** Accesorio para casos especiales (p.ej. "Debe aceptar los términos"). */
  extra?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Banner de resumen de validación. Aparece normalmente cuando el usuario
 * intenta avanzar y hay campos pendientes o con error.
 *
 * Cada ítem es un botón que hace foco en el campo correspondiente
 * (`document.getElementById(key)?.focus()`).
 */
export function FormSummary({ pending, errors, extra, className = '', style }: FormSummaryProps) {
  if (pending.length === 0 && errors.length === 0 && !extra) return null;

  const focus = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className={`form-summary ${className}`} role="alert" style={style}>
      {errors.length > 0 && (
        <>
          <div className="form-summary-title">Corrige los siguientes errores:</div>
          <ul>
            {errors.map((item) => (
              <li key={item.key}>
                <button type="button" onClick={() => focus(item.key)}>
                  <strong>{item.label}:</strong> {item.message}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {pending.length > 0 && (
        <>
          <div className="form-summary-title">
            Faltan {pending.length} campo{pending.length === 1 ? '' : 's'} por completar:
          </div>
          <ul>
            {pending.map((item) => (
              <li key={item.key}>
                <button type="button" onClick={() => focus(item.key)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {extra && <div className="form-summary-extra">{extra}</div>}
    </div>
  );
}
