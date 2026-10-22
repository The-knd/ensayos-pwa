import type { ReactNode } from 'react';
import type { FieldStatus } from '../validation/fieldState';

interface FormFieldProps {
  id?: string;
  label?: ReactNode;
  /** Campo obligatorio: se muestra el asterisco y se marca como pendiente si está vacío. */
  required?: boolean;
  status?: FieldStatus;
  error?: string;
  help?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Envoltorio estándar para un campo de formulario.
 *
 * - Muestra la etiqueta con asterisco si es obligatorio.
 * - Renderiza el mensaje de ayuda o error debajo del control.
 * - Expone el estado (`idle|pending|invalid|valid`) a través de `data-status`
 *   para que el CSS pinte el borde del control automáticamente.
 */
export function FormField({
  id,
  label,
  required,
  status = 'idle',
  error,
  help,
  children,
  className = '',
  style,
}: FormFieldProps) {
  const helpId = id ? `${id}-help` : undefined;

  return (
    <div className={`field ${className}`} data-status={status} style={style}>
      {label !== undefined && (
        <label htmlFor={id}>
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {(help || error) && (
        <div className="help" id={helpId}>
          {error ? (
            <span className="err">{error}</span>
          ) : (
            help
          )}
        </div>
      )}
    </div>
  );
}
