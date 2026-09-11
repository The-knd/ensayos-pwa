import { useState } from 'react';
import { httpClient } from '../../shared/api/httpClient';

interface SumResponse {
  result: number;
  expression: string;
}

export function CalculatorPage() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [result, setResult] = useState<SumResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const res = await httpClient.post('/calculator/sum', { a: Number(a), b: Number(b) });
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
        <div className="s2-top">
          <div className="org-chip">
            <span className="org-dot" />
            Calculadora
          </div>
        </div>
        <h1 className="page-title">Calculadora</h1>
        <p className="lead below">Suma de prueba· Front → Kong → Backend → RBAC.</p>
      </div>

      <div className="s2-body">
        <div className="info-card" style={{ padding: 20 }}>
          <form onSubmit={handleSubmit}>
            <div className="row2">
              <div className="field">
                <label>A</label>
                <input
                  className="inp"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={a}
                  onChange={(e) => setA(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>B</label>
                <input
                  className="inp"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={b}
                  onChange={(e) => setB(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <p style={{ color: '#b00020', fontSize: 12, marginTop: 8 }}>{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={busy} style={{ opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Calculando…' : 'Sumar'}
            </button>
          </form>

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