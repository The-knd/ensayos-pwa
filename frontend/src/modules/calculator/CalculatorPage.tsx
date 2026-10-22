import { useEffect, useState } from 'react';
import { httpClient } from '../../shared/api/httpClient';
import { FormField } from '../../shared/components/FormField';
import { FormSummary } from '../../shared/components/FormSummary';
import { useFieldErrors } from '../../shared/validation/useFieldErrors';
import { useAuth } from '../auth/AuthContext';

interface SumResponse {
  result: number;
  expression: string;
}

export function CalculatorPage() {
  const { moduleContexts, loadModuleContext } = useAuth();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [result, setResult] = useState<SumResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadModuleContext('calculator').catch(() => undefined);
  }, []);

  const ctx = moduleContexts['calculator'];
  const perms = ctx?.permissions ?? [];
  const canSum = perms.includes('calculator.sumar');
  const canRestar = perms.includes('calculator.restar');

  const fields = useFieldErrors({
    values: { a, b },
    required: ['a', 'b'],
    validate: (values) => ({
      a: values.a && !Number.isNaN(Number(values.a)) ? '' : 'Ingrese un número válido',
      b: values.b && !Number.isNaN(Number(values.b)) ? '' : 'Ingrese un número válido',
    }),
  });

  const handleSubmit = async (op: 'sum' | 'restar', e: React.FormEvent) => {
    e.preventDefault();
    fields.touchAll();
    if (!fields.isValid) return;
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const res = await httpClient.post(`/calculator/${op}`, { a: Number(a), b: Number(b) });
      setResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message?.message || 'No se pudo calcular');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="s2">
      <div className="s2-head">
        <h1 className="page-title">Calculadora</h1>
        <p className="lead below">Suma de prueba· Front → Kong → Backend → RBAC.</p>
      </div>

      <div className="s2-body">
        <div className="info-card" style={{ padding: 20 }}>
          <form onSubmit={(e) => handleSubmit('sum', e)}>
            <FormSummary
              pending={fields.pendingKeys.map((k) => ({ key: k, label: `Valor ${k.toUpperCase()}` }))}
              errors={fields.invalidKeys.map((k) => ({ key: k, label: `Valor ${k.toUpperCase()}`, message: fields.errors[k] }))}
            />

            <div className="row2">
              <FormField
                id="calc-a"
                label="A"
                required
                status={fields.status.a}
                error={fields.errors.a}
              >
                <input
                  id="calc-a"
                  className="inp"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={a}
                  onChange={(e) => { setA(e.target.value); fields.touch('a'); }}
                  onBlur={() => fields.touch('a')}
                />
              </FormField>
              <FormField
                id="calc-b"
                label="B"
                required
                status={fields.status.b}
                error={fields.errors.b}
              >
                <input
                  id="calc-b"
                  className="inp"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={b}
                  onChange={(e) => { setB(e.target.value); fields.touch('b'); }}
                  onBlur={() => fields.touch('b')}
                />
              </FormField>
            </div>

            {error && <p style={{ color: '#b00020', fontSize: 12, marginTop: 8 }}>{error}</p>}

            {!ctx ? (
              <p className="empty-state">Cargando permisos…</p>
            ) : (
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                {canSum && (
                  <button type="submit" className="btn btn-primary" disabled={busy} style={{ opacity: busy ? 0.6 : 1 }}>
                    Sumar
                  </button>
                )}
                {canRestar && (
                  <button type="button" onClick={(e) => handleSubmit('restar', e)} className="btn btn-ghost" disabled={busy} style={{ opacity: busy ? 0.6 : 1 }}>
                    Restar
                  </button>
                )}
                {!canSum && !canRestar && (
                  <p className="empty-state" style={{ textAlign: 'left', margin: 0 }}>
                    No tenés operaciones habilitadas para este módulo. Pedí al admin que te otorgue
                    <code> calculator.sumar</code> / <code>calculator.restar</code> desde Perfiles → Permisos.
                  </p>
                )}
              </div>
            )}
          </form><span style={{ fontSize: 11, color: 'var(--faint)' }}>Se muestran solo las operaciones habilitadas para tu perfil.</span>

          {result && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 12,
                background: 'var(--green-soft)',
                color: 'var(--green-deep)',
                fontWeight: 700,
                textAlign: 'center',
                fontSize: 18,
              }}
            >
              {result.expression}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}